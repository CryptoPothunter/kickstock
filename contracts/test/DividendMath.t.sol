// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {DividendMath} from "../src/libraries/DividendMath.sol";

contract AccumulatorHarness {
    uint256 public accDivPerShare;
    uint256 public eligibleSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public debt;
    mapping(address => uint256) public claimable;

    function _settle(address h) internal {
        uint256 p = DividendMath.pending(balanceOf[h], accDivPerShare, debt[h]);
        if (p > 0) claimable[h] += p;
        debt[h] = DividendMath.accumulated(balanceOf[h], accDivPerShare);
    }

    function setBalance(address h, uint256 newBal) external {
        _settle(h);
        eligibleSupply = eligibleSupply - balanceOf[h] + newBal;
        balanceOf[h] = newBal;
        debt[h] = DividendMath.accumulated(newBal, accDivPerShare);
    }

    function distribute(uint256 amount) external {
        accDivPerShare += DividendMath.accDelta(amount, eligibleSupply);
    }

    function pendingOf(address h) external view returns (uint256) {
        return DividendMath.pending(balanceOf[h], accDivPerShare, debt[h]) + claimable[h];
    }
}

contract DividendMathTest is Test {
    AccumulatorHarness internal acc;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);

    function setUp() public {
        acc = new AccumulatorHarness();
    }

    function test_equalHoldersSplitEqually() public {
        acc.setBalance(alice, 100e18);
        acc.setBalance(bob, 100e18);
        acc.distribute(50e18);
        assertEq(acc.pendingOf(alice), 25e18, "alice 50%");
        assertEq(acc.pendingOf(bob), 25e18, "bob 50%");
    }

    function test_weightedSplit() public {
        acc.setBalance(alice, 30e18);
        acc.setBalance(bob, 70e18);
        acc.distribute(100e18);
        assertEq(acc.pendingOf(alice), 30e18, "alice 30%");
        assertEq(acc.pendingOf(bob), 70e18, "bob 70%");
    }

    function test_antiSiphon_lateBuyerGetsNothing() public {
        acc.setBalance(alice, 100e18);
        acc.distribute(50e18);
        acc.setBalance(carol, 100e18);
        assertEq(acc.pendingOf(carol), 0, "late buyer must have zero pending");
        assertEq(acc.pendingOf(alice), 50e18, "alice keeps the whole distribution");
    }

    function test_transferCarriesFutureNotPast() public {
        acc.setBalance(alice, 100e18);
        acc.distribute(50e18);
        acc.setBalance(alice, 0);
        acc.setBalance(bob, 100e18);
        acc.distribute(50e18);
        assertEq(acc.pendingOf(alice), 50e18, "alice keeps first distribution");
        assertEq(acc.pendingOf(bob), 50e18, "bob earns only the second");
    }

    function testFuzz_noOverpayAndBoundedDust(uint256 ba, uint256 bb, uint256 bc, uint256 amount) public {
        ba = bound(ba, 1e18, 1_000_000e18);
        bb = bound(bb, 1e18, 1_000_000e18);
        bc = bound(bc, 1e18, 1_000_000e18);
        amount = bound(amount, 1, 1_000_000e18);

        acc.setBalance(alice, ba);
        acc.setBalance(bob, bb);
        acc.setBalance(carol, bc);
        uint256 supply = ba + bb + bc;
        acc.distribute(amount);

        uint256 paid = acc.pendingOf(alice) + acc.pendingOf(bob) + acc.pendingOf(carol);
        assertLe(paid, amount, "accumulator over-paid");
        uint256 dustBound = supply / 1e18 + 3 + 1;
        assertGe(paid + dustBound, amount, "dust exceeds floor bound");
    }

    function testFuzz_multipleDistributionsAccumulate(uint256 d1, uint256 d2) public {
        d1 = bound(d1, 1e6, 1_000e18);
        d2 = bound(d2, 1e6, 1_000e18);
        acc.setBalance(alice, 100e18);
        acc.setBalance(bob, 100e18);
        uint256 supplyShares = 200;
        acc.distribute(d1);
        acc.distribute(d2);
        uint256 paid = acc.pendingOf(alice) + acc.pendingOf(bob);
        assertLe(paid, d1 + d2, "no overpay across rounds");
        uint256 dustBound = supplyShares * 2 + 2 + 2;
        assertGe(paid + dustBound, d1 + d2, "bounded dust across rounds");
    }
}
