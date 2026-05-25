// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KickTypes} from "./KickTypes.sol";

/// @title DividendMath
/// @notice Pure helpers for the "accumulated dividend per share" pattern.
library DividendMath {
    function accDelta(uint256 amount, uint256 eligibleSupply) internal pure returns (uint256) {
        return (amount * KickTypes.ACC_PRECISION) / eligibleSupply;
    }

    function accumulated(uint256 balance, uint256 accDivPerShare) internal pure returns (uint256) {
        return (balance * accDivPerShare) / KickTypes.ACC_PRECISION;
    }

    function pending(uint256 balance, uint256 accDivPerShare, uint256 debt) internal pure returns (uint256) {
        return accumulated(balance, accDivPerShare) - debt;
    }
}
