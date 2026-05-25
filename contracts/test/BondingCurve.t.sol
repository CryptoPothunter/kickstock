// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";

contract BondingCurveTest is Test {
    uint256 internal constant BASE = 1e18;
    uint256 internal constant SLOPE = 1e16;
    uint256 internal constant MAX_SUPPLY = 1_000_000;

    function test_priceAt_vectors() public pure {
        assertEq(BondingCurve.priceAt(0, BASE, SLOPE), 1e18, "share #1 = 1.00");
        assertEq(BondingCurve.priceAt(100, BASE, SLOPE), 2e18, "share #101 = 2.00");
        assertEq(BondingCurve.priceAt(1000, BASE, SLOPE), 11e18, "share #1001 = 11.00");
    }

    function test_cost_firstShare_equalsBase() public pure {
        assertEq(BondingCurve.cost(0, 1, BASE, SLOPE), BASE, "first share costs BASE");
    }

    function test_cost_buyTwoFromZero() public pure {
        assertEq(BondingCurve.cost(0, 2, BASE, SLOPE), 2e18 + 1e16, "buy 2 from 0 = 2.01");
    }

    function test_proceeds_isCostShiftedDown() public pure {
        uint256 S = 500;
        uint256 n = 7;
        assertEq(
            BondingCurve.proceeds(S, n, BASE, SLOPE),
            BondingCurve.cost(S - n, n, BASE, SLOPE),
            "proceeds(S,n) == cost(S-n,n)"
        );
    }

    function testFuzz_buyMatchesReserveDelta(uint256 S, uint256 n, uint256 slope) public pure {
        S = bound(S, 0, MAX_SUPPLY);
        n = bound(n, 1, MAX_SUPPLY);
        slope = bound(slope, 0, SLOPE);
        uint256 reserveBefore = BondingCurve.reserveOf(S, BASE, slope);
        uint256 reserveAfter = BondingCurve.reserveOf(S + n, BASE, slope);
        assertEq(reserveAfter - reserveBefore, BondingCurve.cost(S, n, BASE, slope), "buy != reserve delta");
    }

    function testFuzz_sellMatchesReserveDelta(uint256 S, uint256 n, uint256 slope) public pure {
        S = bound(S, 1, MAX_SUPPLY);
        n = bound(n, 1, S);
        slope = bound(slope, 0, SLOPE);
        uint256 reserveBefore = BondingCurve.reserveOf(S, BASE, slope);
        uint256 reserveAfter = BondingCurve.reserveOf(S - n, BASE, slope);
        assertEq(reserveBefore - reserveAfter, BondingCurve.proceeds(S, n, BASE, slope), "sell != reserve delta");
    }

    function testFuzz_roundTripIsLossless(uint256 S, uint256 n, uint256 slope) public pure {
        S = bound(S, 0, MAX_SUPPLY);
        n = bound(n, 1, MAX_SUPPLY);
        slope = bound(slope, 0, SLOPE);
        uint256 buyCost = BondingCurve.cost(S, n, BASE, slope);
        uint256 sellGet = BondingCurve.proceeds(S + n, n, BASE, slope);
        assertEq(buyCost, sellGet, "round trip must be lossless (pre-fee)");
    }

    function testFuzz_priceMonotonic(uint256 s, uint256 slope) public pure {
        s = bound(s, 0, MAX_SUPPLY - 1);
        slope = bound(slope, 0, SLOPE);
        uint256 p0 = BondingCurve.priceAt(s, BASE, slope);
        uint256 p1 = BondingCurve.priceAt(s + 1, BASE, slope);
        assertGe(p1, p0, "price must be non-decreasing");
        if (slope > 0) assertGt(p1, p0, "price must strictly increase when slope>0");
    }

    function testFuzz_costSuperadditiveInQuantity(uint256 S, uint256 a, uint256 b) public pure {
        S = bound(S, 0, MAX_SUPPLY);
        a = bound(a, 1, MAX_SUPPLY / 2);
        b = bound(b, 1, MAX_SUPPLY / 2);
        uint256 split = BondingCurve.cost(S, a, BASE, SLOPE) + BondingCurve.cost(S + a, b, BASE, SLOPE);
        uint256 whole = BondingCurve.cost(S, a + b, BASE, SLOPE);
        assertEq(split, whole, "cost must be path-independent");
    }

    function test_reserveOf_zeroAndOne() public pure {
        assertEq(BondingCurve.reserveOf(0, BASE, SLOPE), 0, "reserve(0)==0");
        assertEq(BondingCurve.reserveOf(1, BASE, SLOPE), BASE, "reserve(1)==BASE");
    }

    function test_sellAllReturnsToZeroReserve() public pure {
        uint256 S = 1234;
        assertEq(
            BondingCurve.proceeds(S, S, BASE, SLOPE), BondingCurve.reserveOf(S, BASE, SLOPE), "sell-all == reserve"
        );
        assertEq(BondingCurve.reserveOf(0, BASE, SLOPE), 0, "empty after sell-all");
    }

    function test_cost_zeroIsZero() public pure {
        assertEq(BondingCurve.cost(10, 0, BASE, SLOPE), 0, "cost(_,0)==0");
        assertEq(BondingCurve.proceeds(10, 0, BASE, SLOPE), 0, "proceeds(_,0)==0");
    }
}
