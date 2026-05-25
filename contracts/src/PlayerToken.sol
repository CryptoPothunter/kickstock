// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {KickTypes} from "./libraries/KickTypes.sol";
import {DividendMath} from "./libraries/DividendMath.sol";

/// @title PlayerToken
/// @notice Per-player ERC-20 (18 decimals) with a built-in dividend accumulator.
///         Deployed as an EIP-1167 minimal proxy clone via PlayerTokenFactory.
/// @dev Key design:
///      - `accDivPerShare` (1e18-scaled) tracks cumulative dividends per eligible share.
///      - `eligibleSupply` = totalSupply minus balances held by excluded addresses (AMM pools,
///        PlayerMarket, zero address). Excluded addresses do not earn dividends.
///      - On every transfer/mint/burn, the OZ v5 `_update` hook settles sender & receiver
///        (settle-before-balance-change), then resets their `rewardDebt` and adjusts `eligibleSupply`.
///      - `mintShares` / `burnShares` are gated to the `market` address only.
///      - `accrue(amount)` is called by market/oracle after transferring USDT to this contract.
contract PlayerToken is ERC20 {
    // ── Initializable (clone pattern) ──────────────────────────────
    bool private _initialized;

    // ── Identity ───────────────────────────────────────────────────
    string private _name;
    string private _symbol;

    // ── Access ─────────────────────────────────────────────────────
    address public market;
    address public amm;   // M7: PlayerAMM — also authorized to call accrue

    // ── Dividend state ─────────────────────────────────────────────
    IERC20 public usdt;
    uint256 public accDivPerShare;      // scaled by 1e18
    uint256 public eligibleSupply;      // totalSupply minus excluded balances

    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public claimable;
    mapping(address => bool) public excluded;

    // ── Events ─────────────────────────────────────────────────────
    event DividendAccrued(uint256 amount, uint256 newAccDivPerShare);
    event DividendClaimed(address indexed holder, uint256 amount);
    event ExcludedSet(address indexed account, bool value);

    // ── Constructor (implementation only, clones use initialize) ──
    constructor() ERC20("", "") {
        // Implementation contract — never used directly.
        _initialized = true;
    }

    /// @notice Initialize a clone. Called once by the factory.
    function initialize(
        string calldata name_,
        string calldata symbol_,
        address market_,
        address usdt_
    ) external {
        require(!_initialized, "already initialized");
        _initialized = true;
        _name = name_;
        _symbol = symbol_;
        market = market_;
        usdt = IERC20(usdt_);

        // Exclude zero address and market from dividends
        excluded[address(0)] = true;
        excluded[market_] = true;
    }

    // ── ERC-20 metadata overrides ──────────────────────────────────
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    // ── Modifiers ──────────────────────────────────────────────────
    modifier onlyMarket() {
        if (msg.sender != market) revert KickTypes.NotMarket();
        _;
    }

    modifier onlyMarketOrAmm() {
        if (msg.sender != market && msg.sender != amm) revert KickTypes.NotMarket();
        _;
    }

    // ── Mint / Burn (market only) ──────────────────────────────────
    function mintShares(address to, uint256 amount) external onlyMarket {
        _mint(to, amount);
    }

    function burnShares(address from, uint256 amount) external onlyMarket {
        if (balanceOf(from) < amount) {
            revert KickTypes.InsufficientShares(balanceOf(from), amount);
        }
        _burn(from, amount);
    }

    // ── Dividend: accrue ───────────────────────────────────────────
    /// @notice Bump accDivPerShare after USDT has been transferred to this contract.
    /// @param amount The USDT amount just transferred in.
    function accrue(uint256 amount) external onlyMarketOrAmm {
        if (eligibleSupply == 0) revert KickTypes.NoEligibleSupply(0);
        accDivPerShare += DividendMath.accDelta(amount, eligibleSupply);
        emit DividendAccrued(amount, accDivPerShare);
    }

    // ── Dividend: claim ────────────────────────────────────────────
    /// @notice Settle and withdraw all pending dividends.
    function claim() external returns (uint256 amount) {
        _settle(msg.sender);
        amount = claimable[msg.sender];
        if (amount > 0) {
            claimable[msg.sender] = 0;
            _safeTransferUSDT(msg.sender, amount);
            emit DividendClaimed(msg.sender, amount);
        }
    }

    // ── Dividend: pending (view) ───────────────────────────────────
    /// @notice Total pending dividends for `h` (unsettled + already settled into claimable).
    function pending(address h) external view returns (uint256) {
        if (excluded[h]) return claimable[h];
        return DividendMath.pending(balanceOf(h), accDivPerShare, rewardDebt[h]) + claimable[h];
    }

    // ── Exclusion management ───────────────────────────────────────
    /// @notice Add or remove an address from dividend eligibility.
    function setExcluded(address account, bool value) external onlyMarket {
        if (excluded[account] == value) return;

        // Settle before changing exclusion status
        _settle(account);

        excluded[account] = value;
        uint256 bal = balanceOf(account);
        if (value) {
            // Excluding: remove from eligible supply
            eligibleSupply -= bal;
        } else {
            // Including: add to eligible supply and reset debt
            eligibleSupply += bal;
            rewardDebt[account] = DividendMath.accumulated(bal, accDivPerShare);
        }
        emit ExcludedSet(account, value);
    }

    /// @notice Set the AMM address that is also authorized to call accrue.
    function setAmm(address amm_) external onlyMarket {
        amm = amm_;
    }

    // ── Transfer hook (OZ v5) ──────────────────────────────────────
    /// @dev Called on every mint/burn/transfer. Settles dividends before balance changes,
    ///      then resets debt and adjusts eligibleSupply after.
    function _update(address from, address to, uint256 value) internal override {
        // 1. Settle at OLD balances
        _settle(from);
        _settle(to);

        // 2. Perform the actual balance change
        super._update(from, to, value);

        // 3. Reset debt and sync eligible supply at NEW balances
        _syncDebtAndEligible(from, value, true);   // from lost `value`
        _syncDebtAndEligible(to, value, false);     // to gained `value`
    }

    // ── Internal helpers ───────────────────────────────────────────

    /// @dev Settle pending dividends into `claimable` for a holder.
    function _settle(address h) internal {
        if (h == address(0) || excluded[h]) return;
        uint256 bal = balanceOf(h);
        if (bal == 0) return;
        uint256 p = DividendMath.pending(bal, accDivPerShare, rewardDebt[h]);
        if (p > 0) claimable[h] += p;
        rewardDebt[h] = DividendMath.accumulated(bal, accDivPerShare);
    }

    /// @dev After balance change, reset rewardDebt and adjust eligibleSupply.
    /// @param account The account whose balance changed.
    /// @param amount The amount transferred.
    /// @param isSender True if this account sent tokens (balance decreased).
    function _syncDebtAndEligible(address account, uint256 amount, bool isSender) internal {
        if (account == address(0)) return;

        uint256 newBal = balanceOf(account);
        if (!excluded[account]) {
            // Reset debt to current accumulator position
            rewardDebt[account] = DividendMath.accumulated(newBal, accDivPerShare);
            // Adjust eligible supply
            if (isSender) {
                eligibleSupply -= amount;
            } else {
                eligibleSupply += amount;
            }
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
