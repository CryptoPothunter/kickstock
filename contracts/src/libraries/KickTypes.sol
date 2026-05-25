// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library KickTypes {
    uint16 internal constant BPS = 10_000;
    uint256 internal constant ACC_PRECISION = 1e18;
    uint256 internal constant SHARE_UNIT = 1e18;

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
    error SlippageExceeded(uint256 limit, uint256 actual);
    error InsufficientShares(uint256 have, uint256 want);
    error InsufficientBudget(uint256 have, uint256 want);
    error NoEligibleSupply(uint256 playerId);
    error NotOperator();
    error NotOwner();
    error NotMarket();
    error TransferFailed();
    error FaucetCooldown(uint256 readyAt);
    error WeightsMustSumToBps();
    error ReferrerAlreadySet();
    error SelfReferral();
}
