// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library KickTypes {
    uint16 internal constant BPS = 10_000;
    uint256 internal constant ACC_PRECISION = 1e18;
    uint256 internal constant SHARE_UNIT = 1e18;

    // ── M7: Graduation threshold (reserve must reach this to graduate) ──
    uint256 internal constant GRADUATION_THRESHOLD = 50_000e18; // 50,000 mUSDT

    // ── M7: AMM fee parameters ──────────────────────────────────────────
    uint16 internal constant AMM_FEE_BPS = 100;       // 1% swap fee
    uint16 internal constant AMM_LP_BPS = 6_000;       // 60% of fee → LP (stays in pool)
    uint16 internal constant AMM_DIV_BPS = 3_000;      // 30% of fee → dividend pool
    uint16 internal constant AMM_PROTO_BPS = 1_000;    // 10% of fee → protocol

    // ── M7: Minimum liquidity locked forever on first LP deposit ────────
    uint256 internal constant MINIMUM_LIQUIDITY = 1_000;

    enum StatType {
        GOAL,
        ASSIST,
        CLEAN_SHEET,
        MOTM,
        RED_CARD
    }

    error ZeroAmount();
    error InvalidParam();
    error PlayerNotListed(uint256 playerId);
    error PlayerAlreadyListed(uint256 playerId);
    error AlreadyGraduated(uint256 playerId);
    error NotGraduated(uint256 playerId);
    error BelowGraduationThreshold(uint256 playerId, uint256 reserve);
    error SlippageExceeded(uint256 limit, uint256 actual);
    error InsufficientShares(uint256 have, uint256 want);
    error InsufficientBudget(uint256 have, uint256 want);
    error InsufficientLiquidity();
    error NoEligibleSupply(uint256 playerId);
    error NotOperator();
    error NotOwner();
    error NotMarket();
    error TransferFailed();
    error FaucetCooldown(uint256 readyAt);
    error WeightsMustSumToBps();
    error ReferrerAlreadySet();
    error SelfReferral();
    error AlreadyInitialized();
    error NotInitialized();
    error InvariantViolation();
}
