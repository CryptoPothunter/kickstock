// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {PlayerToken} from "./PlayerToken.sol";
import {KickTypes} from "./libraries/KickTypes.sol";

/// @title PlayerAMM
/// @notice Constant-product (x*y=k) AMM for USDT/PlayerToken pair.
///         Created when a player graduates from the bonding curve.
///         LP shares are minted as ERC-20 tokens of this contract.
///         Swap fee = 1%, split: 60% LP (stays in pool) / 30% dividend / 10% protocol.
contract PlayerAMM is ERC20 {
    // ── Immutables ────────────────────────────────────────────────
    IERC20 public usdt;
    PlayerToken public playerToken;
    address public market;   // PlayerMarket — receives protocol fees, calls accrue

    // ── State ─────────────────────────────────────────────────────
    uint256 public reserveUsdt;
    uint256 public reserveToken;
    bool public initialized;

    // ── Protocol fee accumulator ──────────────────────────────────
    uint256 public protocolFeesUsdt;

    // ── Events ────────────────────────────────────────────────────
    event Initialized(uint256 usdtAmount, uint256 tokenAmount, uint256 lpMinted);
    event LiquidityAdded(address indexed provider, uint256 usdtAmount, uint256 tokenAmount, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 usdtAmount, uint256 tokenAmount, uint256 lpBurned);
    event Swapped(
        address indexed trader,
        bool usdtIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 newReserveUsdt,
        uint256 newReserveToken
    );
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────
    constructor() ERC20("KickStock AMM LP", "KSLP") {}

    // ═══════════════════════════════════════════════════════════════
    // ██  INITIALIZE (called once by PlayerMarket.graduate)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Seed the AMM with initial liquidity. Called once by PlayerMarket during graduation.
    /// @param usdt_       The USDT token address.
    /// @param token_      The PlayerToken address.
    /// @param market_     The PlayerMarket address (for protocol fee + accrue routing).
    /// @param usdtAmount  The USDT amount to seed.
    /// @param tokenAmount The PlayerToken amount to seed.
    function initialize(
        address usdt_,
        address token_,
        address market_,
        uint256 usdtAmount,
        uint256 tokenAmount
    ) external {
        if (initialized) revert KickTypes.AlreadyInitialized();
        if (usdtAmount == 0 || tokenAmount == 0) revert KickTypes.ZeroAmount();

        initialized = true;
        usdt = IERC20(usdt_);
        playerToken = PlayerToken(token_);
        market = market_;

        // Transfer seed liquidity in
        _safeTransferFrom(address(usdt), msg.sender, address(this), usdtAmount);
        _safeTransferFrom(address(playerToken), msg.sender, address(this), tokenAmount);

        reserveUsdt = usdtAmount;
        reserveToken = tokenAmount;

        // Mint initial LP tokens = sqrt(usdtAmount * tokenAmount) - MINIMUM_LIQUIDITY
        uint256 lpAmount = _sqrt(usdtAmount * tokenAmount);
        if (lpAmount <= KickTypes.MINIMUM_LIQUIDITY) revert KickTypes.InsufficientLiquidity();

        // Lock MINIMUM_LIQUIDITY to dead address (prevents zero-supply attacks)
        _mint(address(0xdead), KickTypes.MINIMUM_LIQUIDITY);
        uint256 lpToProvider = lpAmount - KickTypes.MINIMUM_LIQUIDITY;
        _mint(msg.sender, lpToProvider);

        emit Initialized(usdtAmount, tokenAmount, lpToProvider);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  ADD LIQUIDITY
    // ═══════════════════════════════════════════════════════════════

    /// @notice Add liquidity proportionally to the current reserves.
    /// @param usdtAmount USDT to deposit.
    /// @param minLp      Minimum LP tokens expected (slippage protection).
    /// @return lpMinted  LP tokens minted to the caller.
    function addLiquidity(uint256 usdtAmount, uint256 minLp) external returns (uint256 lpMinted) {
        if (!initialized) revert KickTypes.NotInitialized();
        if (usdtAmount == 0) revert KickTypes.ZeroAmount();

        // Calculate proportional token amount
        uint256 tokenAmount = (usdtAmount * reserveToken) / reserveUsdt;
        if (tokenAmount == 0) revert KickTypes.ZeroAmount();

        // Calculate LP to mint proportional to existing supply
        lpMinted = (usdtAmount * totalSupply()) / reserveUsdt;
        if (lpMinted < minLp) revert KickTypes.SlippageExceeded(minLp, lpMinted);

        // Transfer in
        _safeTransferFrom(address(usdt), msg.sender, address(this), usdtAmount);
        _safeTransferFrom(address(playerToken), msg.sender, address(this), tokenAmount);

        reserveUsdt += usdtAmount;
        reserveToken += tokenAmount;

        _mint(msg.sender, lpMinted);

        emit LiquidityAdded(msg.sender, usdtAmount, tokenAmount, lpMinted);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  REMOVE LIQUIDITY
    // ═══════════════════════════════════════════════════════════════

    /// @notice Remove liquidity by burning LP tokens.
    /// @param lpAmount   LP tokens to burn.
    /// @param minUsdt    Minimum USDT expected.
    /// @param minToken   Minimum PlayerToken expected.
    /// @return usdtOut   USDT returned.
    /// @return tokenOut  PlayerToken returned.
    function removeLiquidity(
        uint256 lpAmount,
        uint256 minUsdt,
        uint256 minToken
    ) external returns (uint256 usdtOut, uint256 tokenOut) {
        if (!initialized) revert KickTypes.NotInitialized();
        if (lpAmount == 0) revert KickTypes.ZeroAmount();
        if (balanceOf(msg.sender) < lpAmount) revert KickTypes.InsufficientShares(balanceOf(msg.sender), lpAmount);

        uint256 supply = totalSupply();
        usdtOut = (lpAmount * reserveUsdt) / supply;
        tokenOut = (lpAmount * reserveToken) / supply;

        if (usdtOut < minUsdt) revert KickTypes.SlippageExceeded(minUsdt, usdtOut);
        if (tokenOut < minToken) revert KickTypes.SlippageExceeded(minToken, tokenOut);

        _burn(msg.sender, lpAmount);

        reserveUsdt -= usdtOut;
        reserveToken -= tokenOut;

        _safeTransfer(address(usdt), msg.sender, usdtOut);
        _safeTransfer(address(playerToken), msg.sender, tokenOut);

        emit LiquidityRemoved(msg.sender, usdtOut, tokenOut, lpAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  SWAP: USDT → PlayerToken
    // ═══════════════════════════════════════════════════════════════

    /// @notice Swap USDT for PlayerToken shares.
    /// @param usdtIn   USDT amount to swap.
    /// @param minOut   Minimum PlayerToken expected (slippage protection).
    /// @return tokenOut PlayerToken received.
    function swapUsdtForShares(uint256 usdtIn, uint256 minOut) external returns (uint256 tokenOut) {
        if (!initialized) revert KickTypes.NotInitialized();
        if (usdtIn == 0) revert KickTypes.ZeroAmount();

        // Deduct fee
        uint256 fee = (usdtIn * KickTypes.AMM_FEE_BPS) / KickTypes.BPS;
        uint256 usdtInAfterFee = usdtIn - fee;

        // x * y = k → tokenOut = reserveToken - k / (reserveUsdt + usdtInAfterFee)
        tokenOut = (reserveToken * usdtInAfterFee) / (reserveUsdt + usdtInAfterFee);
        if (tokenOut < minOut) revert KickTypes.SlippageExceeded(minOut, tokenOut);
        if (tokenOut >= reserveToken) revert KickTypes.InsufficientLiquidity();

        // Transfer USDT in
        _safeTransferFrom(address(usdt), msg.sender, address(this), usdtIn);

        // Distribute fee (all in USDT)
        _distributeFee(fee);

        // Update reserves (LP portion of fee stays in reserveUsdt)
        uint256 lpFee = (fee * KickTypes.AMM_LP_BPS) / KickTypes.BPS;
        reserveUsdt += usdtInAfterFee + lpFee;
        reserveToken -= tokenOut;

        // Transfer token out
        _safeTransfer(address(playerToken), msg.sender, tokenOut);

        emit Swapped(msg.sender, true, usdtIn, tokenOut, fee, reserveUsdt, reserveToken);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  SWAP: PlayerToken → USDT
    // ═══════════════════════════════════════════════════════════════

    /// @notice Swap PlayerToken shares for USDT.
    /// @param tokenIn  PlayerToken amount to swap.
    /// @param minOut   Minimum USDT expected (slippage protection).
    /// @return usdtOut USDT received.
    function swapSharesForUsdt(uint256 tokenIn, uint256 minOut) external returns (uint256 usdtOut) {
        if (!initialized) revert KickTypes.NotInitialized();
        if (tokenIn == 0) revert KickTypes.ZeroAmount();

        // Gross USDT out before fee
        uint256 grossOut = (reserveUsdt * tokenIn) / (reserveToken + tokenIn);
        if (grossOut >= reserveUsdt) revert KickTypes.InsufficientLiquidity();

        // Deduct fee from output
        uint256 fee = (grossOut * KickTypes.AMM_FEE_BPS) / KickTypes.BPS;
        usdtOut = grossOut - fee;
        if (usdtOut < minOut) revert KickTypes.SlippageExceeded(minOut, usdtOut);

        // Transfer token in
        _safeTransferFrom(address(playerToken), msg.sender, address(this), tokenIn);

        // Distribute fee
        _distributeFee(fee);

        // Update reserves (LP portion of fee stays in reserveUsdt)
        uint256 lpFee = (fee * KickTypes.AMM_LP_BPS) / KickTypes.BPS;
        reserveUsdt -= grossOut - lpFee;
        reserveToken += tokenIn;

        // Transfer USDT out
        _safeTransfer(address(usdt), msg.sender, usdtOut);

        emit Swapped(msg.sender, false, tokenIn, usdtOut, fee, reserveUsdt, reserveToken);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  ADMIN
    // ═══════════════════════════════════════════════════════════════

    /// @notice Withdraw accumulated protocol fees. Only callable by market owner.
    function withdrawProtocolFees(address to) external {
        if (msg.sender != market) revert KickTypes.NotMarket();
        uint256 amount = protocolFeesUsdt;
        if (amount == 0) revert KickTypes.ZeroAmount();
        protocolFeesUsdt = 0;
        _safeTransfer(address(usdt), to, amount);
        emit ProtocolFeesWithdrawn(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  VIEW
    // ═══════════════════════════════════════════════════════════════

    /// @notice Current price of PlayerToken in USDT terms (reserveUsdt / reserveToken).
    function price() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return (reserveUsdt * 1e18) / reserveToken;
    }

    /// @notice Get the k invariant.
    function getK() external view returns (uint256) {
        return reserveUsdt * reserveToken;
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  INTERNAL
    // ═══════════════════════════════════════════════════════════════

    /// @dev Distribute swap fee: 60% LP (already in pool) / 30% dividend / 10% protocol.
    function _distributeFee(uint256 fee) internal {
        // LP portion (60%) stays in the pool reserves — handled by caller adjusting reserves

        // Dividend portion (30%) → accrue to PlayerToken holders
        uint256 divFee = (fee * KickTypes.AMM_DIV_BPS) / KickTypes.BPS;
        if (divFee > 0 && playerToken.eligibleSupply() > 0) {
            // Transfer USDT to the PlayerToken contract and call accrue via market
            _safeTransfer(address(usdt), address(playerToken), divFee);
            playerToken.accrue(divFee);
        } else {
            // If no eligible supply, dividend goes to protocol
            protocolFeesUsdt += divFee;
        }

        // Protocol portion (10%)
        uint256 protoFee = (fee * KickTypes.AMM_PROTO_BPS) / KickTypes.BPS;
        protocolFeesUsdt += protoFee;
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert KickTypes.TransferFailed();
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert KickTypes.TransferFailed();
        }
    }

    /// @dev Integer square root (Babylonian method).
    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) {
            z = y;
            y = (x / y + y) / 2;
        }
    }
}
