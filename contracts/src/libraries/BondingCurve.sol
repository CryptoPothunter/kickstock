// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title BondingCurve
/// @notice Pure math for KickStock's linear discrete bonding curve.
/// @dev price(s) = base + slope * s
///      cost(S,n) = n*base + slope*( n*S + n*(n-1)/2 )
///      proceeds(S,n) = n*base + slope*( n*(S-n) + n*(n-1)/2 )
///      reserve(S) = S*base + slope*( S*(S-1)/2 )
library BondingCurve {
    function priceAt(uint256 s, uint256 base, uint256 slope) internal pure returns (uint256) {
        return base + slope * s;
    }

    function cost(uint256 S, uint256 n, uint256 base, uint256 slope) internal pure returns (uint256) {
        if (n == 0) return 0;
        uint256 tri = (n * (n - 1)) / 2;
        return n * base + slope * (n * S + tri);
    }

    function proceeds(uint256 S, uint256 n, uint256 base, uint256 slope) internal pure returns (uint256) {
        if (n == 0) return 0;
        uint256 tri = (n * (n - 1)) / 2;
        return n * base + slope * (n * (S - n) + tri);
    }

    function reserveOf(uint256 S, uint256 base, uint256 slope) internal pure returns (uint256) {
        if (S < 2) return S * base;
        uint256 tri = (S * (S - 1)) / 2;
        return S * base + slope * tri;
    }
}
