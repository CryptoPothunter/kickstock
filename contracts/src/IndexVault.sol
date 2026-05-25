// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {PlayerMarket} from "./PlayerMarket.sol";
import {PlayerAMM} from "./PlayerAMM.sol";
import {PlayerToken} from "./PlayerToken.sol";
import {KickTypes} from "./libraries/KickTypes.sol";

/// @title IndexToken
/// @notice ERC-20 basket token for a single index. Minted/burned by IndexVault.
contract IndexToken is ERC20 {
    address public immutable vault;

    modifier onlyVault() {
        if (msg.sender != vault) revert KickTypes.NotMarket();
        _;
    }

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        vault = msg.sender;
    }

    function mint(address to, uint256 amount) external onlyVault {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyVault {
        _burn(from, amount);
    }
}

/// @title IndexVault
/// @notice M10 — Index / ETF system for KickStock.
///         Each index is a basket of player tokens with defined weights.
///         mint() buys components proportionally; redeem() sells them back to USDT.
///         Routes through bonding curve (un-graduated) or AMM (graduated) automatically.
contract IndexVault is Ownable {
    // ── Types ────────────────────────────────────────────────────
    enum IndexKind { NATIONAL, POSITION, CONTINENTAL, ALLSTAR, CUSTOM }

    struct Index {
        string name;
        IndexKind kind;
        address basketToken;        // IndexToken ERC-20 address
        uint256[] components;       // playerIds
        uint16[] weightBps;         // weight per component (Σ = 10_000)
        bool active;
    }

    // ── State ────────────────────────────────────────────────────
    IERC20 public immutable usdt;
    PlayerMarket public immutable market;

    mapping(uint256 => Index) public indices;
    uint256[] public indexIds;
    uint256 public nextIndexId = 1;

    // ── Events ───────────────────────────────────────────────────
    event IndexDefined(uint256 indexed indexId, string name, IndexKind kind, address basketToken);
    event IndexMinted(uint256 indexed indexId, address indexed user, uint256 units, uint256 totalCost);
    event IndexRedeemed(uint256 indexed indexId, address indexed user, uint256 units, uint256 totalProceeds);
    event IndexDeactivated(uint256 indexed indexId);

    // ── Constructor ──────────────────────────────────────────────
    constructor(address usdt_, address market_) Ownable(msg.sender) {
        if (usdt_ == address(0) || market_ == address(0)) revert KickTypes.InvalidParam();
        usdt = IERC20(usdt_);
        market = PlayerMarket(market_);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  DEFINE INDEX
    // ═══════════════════════════════════════════════════════════════

    /// @notice Define a new index with components and weights.
    /// @param name        Human-readable name (e.g. "Argentina National Squad")
    /// @param kind        Index kind enum
    /// @param components  Array of playerIds
    /// @param weightBps   Array of weights in BPS (must sum to 10_000)
    /// @return indexId    The assigned index ID
    function defineIndex(
        string calldata name,
        IndexKind kind,
        uint256[] calldata components,
        uint16[] calldata weightBps
    ) external onlyOwner returns (uint256 indexId) {
        uint256 len = components.length;
        if (len == 0) revert KickTypes.InvalidParam();
        if (len != weightBps.length) revert KickTypes.InvalidParam();

        // Verify weights sum to BPS (10_000)
        uint256 totalWeight;
        for (uint256 i; i < len; ++i) {
            if (weightBps[i] == 0) revert KickTypes.InvalidParam();
            totalWeight += weightBps[i];
        }
        if (totalWeight != KickTypes.BPS) revert KickTypes.WeightsMustSumToBps();

        // Verify all components are listed players
        for (uint256 i; i < len; ++i) {
            (address token,,,) = market.players(components[i]);
            if (token == address(0)) revert KickTypes.PlayerNotListed(components[i]);
        }

        indexId = nextIndexId++;

        // Deploy basket token
        string memory symbol = string(abi.encodePacked("KSI-", _uint2str(indexId)));
        IndexToken basketToken = new IndexToken(
            string(abi.encodePacked("KickStock Index: ", name)),
            symbol
        );

        // Copy arrays to storage
        indices[indexId].name = name;
        indices[indexId].kind = kind;
        indices[indexId].basketToken = address(basketToken);
        indices[indexId].active = true;

        for (uint256 i; i < len; ++i) {
            indices[indexId].components.push(components[i]);
            indices[indexId].weightBps.push(weightBps[i]);
        }

        indexIds.push(indexId);

        emit IndexDefined(indexId, name, kind, address(basketToken));
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  MINT (Buy into Index)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Mint `units` of an index basket token by buying components proportionally.
    ///         Each unit = 1e18 basket token. The vault buys `units * weight / BPS` USDT worth
    ///         of each component, routing through bonding curve or AMM as appropriate.
    /// @param indexId   The index to mint.
    /// @param units     Number of basket units (in 1e18 increments).
    /// @param maxTotal  Maximum total USDT willing to spend (slippage protection).
    function mint(uint256 indexId, uint256 units, uint256 maxTotal) external {
        Index storage idx = indices[indexId];
        if (!idx.active) revert KickTypes.InvalidParam();
        if (units == 0) revert KickTypes.ZeroAmount();

        uint256 len = idx.components.length;
        uint256 totalSpent;

        // Pull max USDT from user first (we'll refund remainder)
        _safeTransferFrom(msg.sender, address(this), maxTotal);

        for (uint256 i; i < len; ++i) {
            uint256 playerId = idx.components[i];
            // USDT allocation for this component = units * SHARE_UNIT * weight / BPS
            // 1 unit = 1 USDT notional; scale to 18 decimals
            uint256 allocation = (units * KickTypes.SHARE_UNIT * uint256(idx.weightBps[i])) / KickTypes.BPS;
            if (allocation == 0) continue;

            uint256 spent = _buyComponent(playerId, allocation);
            totalSpent += spent;
        }

        if (totalSpent > maxTotal) revert KickTypes.SlippageExceeded(maxTotal, totalSpent);

        // Refund unused USDT
        uint256 refund = maxTotal - totalSpent;
        if (refund > 0) {
            _safeTransferUSDT(msg.sender, refund);
        }

        // Mint basket tokens
        IndexToken(idx.basketToken).mint(msg.sender, units * KickTypes.SHARE_UNIT);

        emit IndexMinted(indexId, msg.sender, units, totalSpent);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  REDEEM (Sell out of Index)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Redeem `units` of basket token, selling components proportionally for USDT.
    /// @param indexId   The index to redeem.
    /// @param units     Number of basket units to redeem (in 1e18 increments).
    /// @param minNet    Minimum total USDT expected (slippage protection).
    function redeem(uint256 indexId, uint256 units, uint256 minNet) external {
        Index storage idx = indices[indexId];
        if (!idx.active) revert KickTypes.InvalidParam();
        if (units == 0) revert KickTypes.ZeroAmount();

        uint256 basketAmount = units * KickTypes.SHARE_UNIT;
        IndexToken basket = IndexToken(idx.basketToken);
        if (basket.balanceOf(msg.sender) < basketAmount) {
            revert KickTypes.InsufficientShares(basket.balanceOf(msg.sender), basketAmount);
        }

        // Burn basket tokens first
        basket.burn(msg.sender, basketAmount);

        uint256 len = idx.components.length;
        uint256 totalReceived;
        uint256 totalBasketSupplyBefore = basket.totalSupply() + basketAmount; // supply before burn

        for (uint256 i; i < len; ++i) {
            uint256 playerId = idx.components[i];
            // Calculate how many player tokens this unit represents
            // proportional to what the vault holds
            (address token,,,) = market.players(playerId);
            uint256 vaultBalance = IERC20(token).balanceOf(address(this));
            // User's share of vault holdings = vaultBalance * basketAmount / totalBasketSupplyBefore
            uint256 tokenAmount = (vaultBalance * basketAmount) / totalBasketSupplyBefore;
            if (tokenAmount == 0) continue;

            uint256 received = _sellComponent(playerId, tokenAmount);
            totalReceived += received;
        }

        if (totalReceived < minNet) revert KickTypes.SlippageExceeded(minNet, totalReceived);

        // Transfer USDT to user
        _safeTransferUSDT(msg.sender, totalReceived);

        emit IndexRedeemed(indexId, msg.sender, units, totalReceived);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  NAV (Net Asset Value)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Calculate the NAV per basket token unit.
    ///         NAV = (Σ component sell value of vault holdings) / total basket supply.
    /// @param indexId The index to calculate NAV for.
    /// @return navPerUnit NAV per 1e18 basket token, in USDT (18 decimals).
    function nav(uint256 indexId) external view returns (uint256 navPerUnit) {
        Index storage idx = indices[indexId];
        if (idx.basketToken == address(0)) revert KickTypes.InvalidParam();

        uint256 totalSupply = IndexToken(idx.basketToken).totalSupply();
        if (totalSupply == 0) return 0;

        uint256 totalValue;
        uint256 len = idx.components.length;

        for (uint256 i; i < len; ++i) {
            uint256 playerId = idx.components[i];
            (address token,,,) = market.players(playerId);
            uint256 vaultBalance = IERC20(token).balanceOf(address(this));
            if (vaultBalance == 0) continue;

            totalValue += _componentValue(playerId, vaultBalance);
        }

        navPerUnit = (totalValue * KickTypes.SHARE_UNIT) / totalSupply;
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  ADMIN
    // ═══════════════════════════════════════════════════════════════

    /// @notice Deactivate an index (prevents new mints, redeems still work).
    function deactivateIndex(uint256 indexId) external onlyOwner {
        indices[indexId].active = false;
        emit IndexDeactivated(indexId);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════

    /// @notice Get index count.
    function indexCount() external view returns (uint256) {
        return indexIds.length;
    }

    /// @notice Get full index details.
    function getIndex(uint256 indexId) external view returns (
        string memory name,
        IndexKind kind,
        address basketToken,
        uint256[] memory components,
        uint16[] memory weightBps,
        bool active
    ) {
        Index storage idx = indices[indexId];
        return (idx.name, idx.kind, idx.basketToken, idx.components, idx.weightBps, idx.active);
    }

    /// @notice Get the value of each component in the index (for UI breakdown).
    function componentValues(uint256 indexId) external view returns (
        uint256[] memory playerIds,
        uint256[] memory values,
        uint256[] memory balances
    ) {
        Index storage idx = indices[indexId];
        uint256 len = idx.components.length;
        playerIds = new uint256[](len);
        values = new uint256[](len);
        balances = new uint256[](len);

        for (uint256 i; i < len; ++i) {
            playerIds[i] = idx.components[i];
            (address token,,,) = market.players(playerIds[i]);
            balances[i] = IERC20(token).balanceOf(address(this));
            if (balances[i] > 0) {
                values[i] = _componentValue(playerIds[i], balances[i]);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  INTERNAL — ROUTING
    // ═══════════════════════════════════════════════════════════════

    /// @dev Buy a component player token using `usdtAmount` USDT.
    ///      Routes through bonding curve (un-graduated) or AMM (graduated).
    /// @return spent Actual USDT spent.
    function _buyComponent(uint256 playerId, uint256 usdtAmount) internal returns (uint256 spent) {
        if (market.graduated(playerId)) {
            // Graduated → AMM swap
            address ammAddr = market.playerAmm(playerId);
            PlayerAMM amm = PlayerAMM(ammAddr);

            _approveToken(address(usdt), ammAddr, usdtAmount);
            amm.swapUsdtForShares(usdtAmount, 0); // minOut=0, slippage at aggregate level
            spent = usdtAmount;
        } else {
            // Not graduated → Bonding curve buy
            // Figure out how many shares we can buy with usdtAmount
            // Binary search: find max shares where quoteBuy cost ≤ usdtAmount
            (,uint256 supply,,) = market.players(playerId);
            uint256 shares = _estimateShares(playerId, supply, usdtAmount);
            if (shares == 0) return 0;

            (uint256 totalCost,) = market.quoteBuy(playerId, shares);

            // Approve market for the cost
            _approveToken(address(usdt), address(market), totalCost);
            market.buy(playerId, shares, totalCost);
            spent = totalCost;
        }
    }

    /// @dev Sell `tokenAmount` of a component player token for USDT.
    ///      Routes through bonding curve (un-graduated) or AMM (graduated).
    /// @return received USDT received.
    function _sellComponent(uint256 playerId, uint256 tokenAmount) internal returns (uint256 received) {
        if (market.graduated(playerId)) {
            // Graduated → AMM swap
            address ammAddr = market.playerAmm(playerId);
            PlayerAMM amm = PlayerAMM(ammAddr);

            (address token,,,) = market.players(playerId);
            _approveToken(token, ammAddr, tokenAmount);
            received = amm.swapSharesForUsdt(tokenAmount, 0); // minOut=0, slippage at aggregate level
        } else {
            // Not graduated → Bonding curve sell
            // tokenAmount is in raw token units (1e18 per share)
            uint256 shares = tokenAmount / KickTypes.SHARE_UNIT;
            if (shares == 0) return 0;

            (uint256 netProceeds,) = market.quoteSell(playerId, shares);
            market.sell(playerId, shares, 0); // minNet=0, aggregate slippage
            received = netProceeds;
        }
    }

    /// @dev Estimate how many whole shares can be bought with `usdtBudget`.
    ///      Uses iterative approximation based on current price.
    function _estimateShares(uint256 playerId, uint256 /* currentSupply */, uint256 usdtBudget)
        internal
        view
        returns (uint256 shares)
    {
        // Quick estimate: shares ≈ budget / currentPrice
        uint256 curPrice = market.currentPrice(playerId);
        if (curPrice == 0) return 0;

        // Start with an optimistic estimate (no fee)
        shares = usdtBudget / curPrice;
        if (shares == 0) return 0;

        // Adjust down until cost fits budget (max 10 iterations)
        for (uint256 i; i < 10; ++i) {
            try market.quoteBuy(playerId, shares) returns (uint256 cost, uint256) {
                if (cost <= usdtBudget) return shares;
                shares = shares > 1 ? shares - 1 : 0;
                if (shares == 0) return 0;
            } catch {
                shares = shares > 1 ? shares - 1 : 0;
                if (shares == 0) return 0;
            }
        }
    }

    /// @dev Get the sell value of `tokenAmount` player tokens in USDT (view).
    function _componentValue(uint256 playerId, uint256 tokenAmount) internal view returns (uint256) {
        if (market.graduated(playerId)) {
            // AMM price: value = reserveUsdt * tokenAmount / (reserveToken + tokenAmount)
            address ammAddr = market.playerAmm(playerId);
            PlayerAMM amm = PlayerAMM(ammAddr);
            uint256 rUsdt = amm.reserveUsdt();
            uint256 rToken = amm.reserveToken();
            if (rToken == 0) return 0;
            // Gross output (before fee)
            uint256 grossOut = (rUsdt * tokenAmount) / (rToken + tokenAmount);
            // After 1% fee
            uint256 fee = (grossOut * KickTypes.AMM_FEE_BPS) / KickTypes.BPS;
            return grossOut - fee;
        } else {
            // Bonding curve: sell proceeds for shares
            uint256 shares = tokenAmount / KickTypes.SHARE_UNIT;
            if (shares == 0) return 0;
            try market.quoteSell(playerId, shares) returns (uint256 netProceeds, uint256) {
                return netProceeds;
            } catch {
                return 0;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  INTERNAL — TRANSFERS
    // ═══════════════════════════════════════════════════════════════

    function _approveToken(address token, address spender, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert KickTypes.TransferFailed();
        }
    }

    function _safeTransferFrom(address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(usdt).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert KickTypes.TransferFailed();
        }
    }

    function _safeTransferUSDT(address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(usdt).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert KickTypes.TransferFailed();
        }
    }

    /// @dev Convert uint to decimal string (for symbol generation).
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
