// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {PlayerToken} from "./PlayerToken.sol";
import {PlayerTokenFactory} from "./PlayerTokenFactory.sol";
import {BondingCurve} from "./libraries/BondingCurve.sol";
import {KickTypes} from "./libraries/KickTypes.sol";

/// @title PlayerMarket
/// @notice Primary market for KickStock player tokens. No graduation in this version.
///         Uses a linear bonding curve for pricing, three-way fee split, and slippage protection.
/// @dev All amounts are in USDT (18 decimals). Shares are in SHARE_UNIT (1e18) increments.
contract PlayerMarket is Ownable {
    // ── Immutables ────────────────────────────────────────────────
    IERC20 public immutable usdt;
    PlayerTokenFactory public immutable factory;

    // ── Curve parameters ──────────────────────────────────────────
    uint256 public curveBase = 100e18;     // base price: 100 mUSDT
    uint256 public curveSlope = 10e18;     // slope: 10 mUSDT per share

    // ── Fee parameters (in BPS, must sum ≤ 10_000) ────────────────
    uint16 public feeBps = 300;            // total fee: 3%
    uint16 public referralBps = 3_000;     // 30% of fee → referrer
    uint16 public divShareBps = 5_000;     // 50% of fee → dividend pool
    // remainder (20%) → protocol

    // ── Oracle ────────────────────────────────────────────────────
    address public oracle;

    // ── Per-player state ──────────────────────────────────────────
    struct PlayerInfo {
        address token;           // PlayerToken clone address
        uint256 supply;          // current supply in SHARE_UNIT units (count of shares)
        uint256 reserve;         // USDT backing the bonding curve
        uint256 dividendBudget;  // USDT earmarked for future dividends
    }

    mapping(uint256 => PlayerInfo) public players;
    uint256[] public listedPlayerIds;

    // ── Referral tracking ─────────────────────────────────────────
    mapping(address => address) public referrer;

    // ── Protocol fees ─────────────────────────────────────────────
    uint256 public protocolFees;

    // ── Events ────────────────────────────────────────────────────
    event PlayerListed(uint256 indexed playerId, address token, string name, string symbol);
    event Bought(
        uint256 indexed playerId,
        address indexed buyer,
        uint256 shares,
        uint256 totalCost,
        uint256 fee,
        uint256 newSupply
    );
    event Sold(
        uint256 indexed playerId,
        address indexed seller,
        uint256 shares,
        uint256 netProceeds,
        uint256 fee,
        uint256 newSupply
    );
    event ReferralPaid(address indexed referrer, address indexed trader, uint256 amount);
    event DividendFunded(uint256 indexed playerId, uint256 amount);
    event DividendDistributed(uint256 indexed playerId, KickTypes.StatType statType, uint256 amount);
    event ParamUpdated(string param, uint256 value);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);
    event ReferrerSet(address indexed user, address indexed ref);

    // ── Constructor ───────────────────────────────────────────────
    constructor(address usdt_, address factory_) Ownable(msg.sender) {
        if (usdt_ == address(0) || factory_ == address(0)) revert KickTypes.InvalidParam();
        usdt = IERC20(usdt_);
        factory = PlayerTokenFactory(factory_);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  LISTING
    // ═══════════════════════════════════════════════════════════════

    /// @notice List a new player token on the market.
    function listPlayer(uint256 playerId, string calldata name_, string calldata symbol_) external onlyOwner {
        if (players[playerId].token != address(0)) revert KickTypes.PlayerAlreadyListed(playerId);

        address token = factory.createToken(playerId, name_, symbol_, address(this), address(usdt));
        players[playerId].token = token;
        listedPlayerIds.push(playerId);

        // Exclude this market contract from dividends (already done in PlayerToken.initialize)
        emit PlayerListed(playerId, token, name_, symbol_);
    }

    /// @notice Batch list multiple players in one transaction.
    function listPlayersBatch(
        uint256[] calldata playerIds,
        string[] calldata names,
        string[] calldata symbols
    ) external onlyOwner {
        uint256 len = playerIds.length;
        if (len != names.length || len != symbols.length) revert KickTypes.InvalidParam();

        for (uint256 i; i < len; ++i) {
            uint256 pid = playerIds[i];
            if (players[pid].token != address(0)) revert KickTypes.PlayerAlreadyListed(pid);

            address token = factory.createToken(pid, names[i], symbols[i], address(this), address(usdt));
            players[pid].token = token;
            listedPlayerIds.push(pid);

            emit PlayerListed(pid, token, names[i], symbols[i]);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  QUOTING (VIEW)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Current marginal price for the next share of a player.
    function currentPrice(uint256 playerId) external view returns (uint256) {
        _requireListed(playerId);
        return BondingCurve.priceAt(players[playerId].supply, curveBase, curveSlope);
    }

    /// @notice Quote the total cost (including fee) to buy `shares` of a player.
    /// @return totalCost The total USDT the buyer must pay.
    /// @return fee The fee portion of totalCost.
    function quoteBuy(uint256 playerId, uint256 shares) external view returns (uint256 totalCost, uint256 fee) {
        _requireListed(playerId);
        if (shares == 0) revert KickTypes.ZeroAmount();
        uint256 rawCost = BondingCurve.cost(players[playerId].supply, shares, curveBase, curveSlope);
        fee = (rawCost * feeBps) / KickTypes.BPS;
        totalCost = rawCost + fee;
    }

    /// @notice Quote the net proceeds (after fee) from selling `shares` of a player.
    /// @return netProceeds The USDT the seller receives.
    /// @return fee The fee deducted from gross proceeds.
    function quoteSell(uint256 playerId, uint256 shares) external view returns (uint256 netProceeds, uint256 fee) {
        _requireListed(playerId);
        if (shares == 0) revert KickTypes.ZeroAmount();
        if (players[playerId].supply < shares) revert KickTypes.InsufficientShares(players[playerId].supply, shares);
        uint256 rawProceeds = BondingCurve.proceeds(players[playerId].supply, shares, curveBase, curveSlope);
        fee = (rawProceeds * feeBps) / KickTypes.BPS;
        netProceeds = rawProceeds - fee;
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  TRADING
    // ═══════════════════════════════════════════════════════════════

    /// @notice Buy shares of a player token on the bonding curve.
    /// @param playerId The player to buy.
    /// @param shares Number of shares (in SHARE_UNIT = 1e18).
    /// @param maxTotal Maximum USDT the buyer is willing to pay (slippage protection).
    function buy(uint256 playerId, uint256 shares, uint256 maxTotal) external {
        _requireListed(playerId);
        if (shares == 0) revert KickTypes.ZeroAmount();

        PlayerInfo storage info = players[playerId];

        // Calculate cost
        uint256 rawCost = BondingCurve.cost(info.supply, shares, curveBase, curveSlope);
        uint256 fee = (rawCost * feeBps) / KickTypes.BPS;
        uint256 totalCost = rawCost + fee;

        // Slippage check
        if (totalCost > maxTotal) revert KickTypes.SlippageExceeded(maxTotal, totalCost);

        // Transfer USDT from buyer
        _safeTransferFrom(msg.sender, address(this), totalCost);

        // Update state
        info.supply += shares;
        info.reserve += rawCost;

        // Split fee
        _splitFee(fee, msg.sender, playerId);

        // Mint player tokens to buyer
        PlayerToken(info.token).mintShares(msg.sender, shares * KickTypes.SHARE_UNIT);

        emit Bought(playerId, msg.sender, shares, totalCost, fee, info.supply);
    }

    /// @notice Sell shares of a player token back to the bonding curve.
    /// @param playerId The player to sell.
    /// @param shares Number of shares (in SHARE_UNIT = 1e18).
    /// @param minNet Minimum USDT the seller expects to receive (slippage protection).
    function sell(uint256 playerId, uint256 shares, uint256 minNet) external {
        _requireListed(playerId);
        if (shares == 0) revert KickTypes.ZeroAmount();

        PlayerInfo storage info = players[playerId];

        if (info.supply < shares) revert KickTypes.InsufficientShares(info.supply, shares);

        // Calculate proceeds
        uint256 rawProceeds = BondingCurve.proceeds(info.supply, shares, curveBase, curveSlope);
        uint256 fee = (rawProceeds * feeBps) / KickTypes.BPS;
        uint256 netProceeds = rawProceeds - fee;

        // Slippage check
        if (netProceeds < minNet) revert KickTypes.SlippageExceeded(minNet, netProceeds);

        // Burn player tokens from seller
        PlayerToken(info.token).burnShares(msg.sender, shares * KickTypes.SHARE_UNIT);

        // Update state
        info.supply -= shares;
        info.reserve -= rawProceeds;

        // Split fee
        _splitFee(fee, msg.sender, playerId);

        // Transfer USDT to seller
        _safeTransferUSDT(msg.sender, netProceeds);

        emit Sold(playerId, msg.sender, shares, netProceeds, fee, info.supply);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  REFERRAL
    // ═══════════════════════════════════════════════════════════════

    /// @notice Set the referrer for the caller. Can only be set once.
    function setReferrer(address ref) external {
        if (ref == msg.sender) revert KickTypes.SelfReferral();
        if (referrer[msg.sender] != address(0)) revert KickTypes.ReferrerAlreadySet();
        if (ref == address(0)) revert KickTypes.InvalidParam();
        referrer[msg.sender] = ref;
        emit ReferrerSet(msg.sender, ref);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  DIVIDEND DISTRIBUTION (called by Oracle)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Distribute dividends from the player's dividendBudget.
    ///         Called by the oracle after a performance event.
    /// @param playerId The player whose budget to draw from.
    /// @param statType The stat type triggering the distribution.
    /// @param amount The USDT amount to distribute.
    function distribute(uint256 playerId, KickTypes.StatType statType, uint256 amount) external {
        if (msg.sender != oracle) revert KickTypes.NotOperator();
        _requireListed(playerId);
        if (amount == 0) revert KickTypes.ZeroAmount();

        PlayerInfo storage info = players[playerId];
        if (info.dividendBudget < amount) {
            revert KickTypes.InsufficientBudget(info.dividendBudget, amount);
        }

        info.dividendBudget -= amount;

        // Transfer USDT to the PlayerToken contract and call accrue
        address token = info.token;
        _safeTransferUSDT(token, amount);
        PlayerToken(token).accrue(amount);

        emit DividendDistributed(playerId, statType, amount);
    }

    /// @notice Anyone can fund a player's dividend budget externally.
    /// @param playerId The player to fund.
    /// @param amount The USDT amount to add to dividendBudget.
    function fundDividends(uint256 playerId, uint256 amount) external {
        _requireListed(playerId);
        if (amount == 0) revert KickTypes.ZeroAmount();

        _safeTransferFrom(msg.sender, address(this), amount);
        players[playerId].dividendBudget += amount;

        emit DividendFunded(playerId, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  ADMIN
    // ═══════════════════════════════════════════════════════════════

    function withdrawProtocolFees(address to) external onlyOwner {
        uint256 amount = protocolFees;
        if (amount == 0) revert KickTypes.ZeroAmount();
        protocolFees = 0;
        _safeTransferUSDT(to, amount);
        emit ProtocolFeesWithdrawn(to, amount);
    }

    function setOracle(address oracle_) external onlyOwner {
        emit OracleUpdated(oracle, oracle_);
        oracle = oracle_;
    }

    function setCurveBase(uint256 base_) external onlyOwner {
        if (base_ == 0) revert KickTypes.InvalidParam();
        curveBase = base_;
        emit ParamUpdated("curveBase", base_);
    }

    function setCurveSlope(uint256 slope_) external onlyOwner {
        curveSlope = slope_;
        emit ParamUpdated("curveSlope", slope_);
    }

    function setFeeBps(uint16 feeBps_) external onlyOwner {
        if (feeBps_ > KickTypes.BPS) revert KickTypes.InvalidParam();
        feeBps = feeBps_;
        emit ParamUpdated("feeBps", feeBps_);
    }

    function setFeeWeights(uint16 referralBps_, uint16 divShareBps_) external onlyOwner {
        if (referralBps_ + divShareBps_ > KickTypes.BPS) revert KickTypes.WeightsMustSumToBps();
        referralBps = referralBps_;
        divShareBps = divShareBps_;
        emit ParamUpdated("referralBps", referralBps_);
        emit ParamUpdated("divShareBps", divShareBps_);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════

    function listedCount() external view returns (uint256) {
        return listedPlayerIds.length;
    }

    function getPlayerInfo(uint256 playerId) external view returns (PlayerInfo memory) {
        return players[playerId];
    }

    /// @notice Compute the theoretical reserve for the current supply via the curve formula.
    function reserveOf(uint256 playerId) external view returns (uint256) {
        _requireListed(playerId);
        return BondingCurve.reserveOf(players[playerId].supply, curveBase, curveSlope);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  INTERNAL
    // ═══════════════════════════════════════════════════════════════

    /// @dev Three-way fee split: referral → dividend budget → protocol.
    function _splitFee(uint256 fee, address trader, uint256 playerId) internal {
        if (fee == 0) return;

        // 1. Referral share
        uint256 refShare;
        address ref = referrer[trader];
        if (ref != address(0)) {
            refShare = (fee * referralBps) / KickTypes.BPS;
            if (refShare > 0) {
                _safeTransferUSDT(ref, refShare);
                emit ReferralPaid(ref, trader, refShare);
            }
        }

        // 2. Dividend share → player's dividendBudget
        uint256 divShare = (fee * divShareBps) / KickTypes.BPS;
        players[playerId].dividendBudget += divShare;

        // 3. Protocol gets the remainder
        uint256 protocolShare = fee - refShare - divShare;
        protocolFees += protocolShare;
    }

    function _requireListed(uint256 playerId) internal view {
        if (players[playerId].token == address(0)) revert KickTypes.PlayerNotListed(playerId);
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
}
