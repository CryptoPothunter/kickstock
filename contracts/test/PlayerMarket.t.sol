// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

contract PlayerMarketTest is Test {
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant PID = 1;
    uint256 constant BASE = 100e18;
    uint256 constant SLOPE = 10e18;

    function setUp() public {
        usdt    = new MockUSDT();
        factory = new PlayerTokenFactory();
        market  = new PlayerMarket(address(usdt), address(factory));

        // List player 1
        market.listPlayer(PID, "KickStock Messi", "KMESSI");

        // Fund accounts
        usdt.mint(alice, 1_000_000e18);
        usdt.mint(bob,   1_000_000e18);
        usdt.mint(carol, 1_000_000e18);

        vm.prank(alice);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(carol);
        usdt.approve(address(market), type(uint256).max);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  LISTING
    // ══════════════════════════════════════════════════════════════

    function test_listPlayer() public view {
        (address token,,,) = market.players(PID);
        assertTrue(token != address(0), "token should be deployed");
        assertEq(market.listedCount(), 1);
    }

    function test_listPlayer_revertDuplicate() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.PlayerAlreadyListed.selector, PID));
        market.listPlayer(PID, "dup", "DUP");
    }

    function test_listPlayersBatch() public {
        uint256[] memory ids = new uint256[](3);
        string[] memory names = new string[](3);
        string[] memory symbols = new string[](3);
        ids[0] = 10; ids[1] = 11; ids[2] = 12;
        names[0] = "P10"; names[1] = "P11"; names[2] = "P12";
        symbols[0] = "K10"; symbols[1] = "K11"; symbols[2] = "K12";

        market.listPlayersBatch(ids, names, symbols);
        assertEq(market.listedCount(), 4); // 1 from setUp + 3
    }

    function test_listPlayer_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        market.listPlayer(99, "x", "X");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  QUOTING
    // ══════════════════════════════════════════════════════════════

    function test_currentPrice_atZeroSupply() public view {
        uint256 p = market.currentPrice(PID);
        assertEq(p, BASE, "price at supply 0 = base");
    }

    function test_quoteBuy() public view {
        (uint256 totalCost, uint256 fee) = market.quoteBuy(PID, 1);
        uint256 rawCost = BondingCurve.cost(0, 1, BASE, SLOPE);
        uint256 expectedFee = (rawCost * 300) / 10_000;
        assertEq(fee, expectedFee);
        assertEq(totalCost, rawCost + expectedFee);
    }

    function test_quoteSell_revertNoSupply() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.InsufficientShares.selector, 0, 1));
        market.quoteSell(PID, 1);
    }

    function test_quoteBuy_revertZero() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        market.quoteBuy(PID, 0);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  BUY
    // ══════════════════════════════════════════════════════════════

    function test_buy_single() public {
        (uint256 totalCost,) = market.quoteBuy(PID, 1);

        vm.prank(alice);
        market.buy(PID, 1, totalCost);

        (address token, uint256 supply, uint256 reserve,) = market.players(PID);
        assertEq(supply, 1, "supply should be 1");

        // Reserve should equal the raw cost (without fee)
        uint256 rawCost = BondingCurve.cost(0, 1, BASE, SLOPE);
        assertEq(reserve, rawCost, "reserve == rawCost");

        // Token balance
        assertEq(PlayerToken(token).balanceOf(alice), 1e18, "alice should have 1 share");
    }

    function test_buy_slippageRevert() public {
        vm.prank(alice);
        vm.expectRevert(); // SlippageExceeded
        market.buy(PID, 1, 1); // maxTotal = 1 wei, too low
    }

    function test_buy_multiple_shares() public {
        uint256 shares = 5;
        (uint256 totalCost,) = market.quoteBuy(PID, shares);

        vm.prank(alice);
        market.buy(PID, shares, totalCost);

        (, uint256 supply,,) = market.players(PID);
        assertEq(supply, shares);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  SELL
    // ══════════════════════════════════════════════════════════════

    function test_sell_all() public {
        uint256 shares = 3;
        (uint256 totalCost,) = market.quoteBuy(PID, shares);

        vm.prank(alice);
        market.buy(PID, shares, totalCost);

        // Get quote for selling all
        (uint256 netProceeds,) = market.quoteSell(PID, shares);

        vm.prank(alice);
        market.sell(PID, shares, netProceeds);

        (, uint256 supply,,) = market.players(PID);
        assertEq(supply, 0, "supply should be 0 after sell-all");
    }

    function test_sell_slippageRevert() public {
        (uint256 totalCost,) = market.quoteBuy(PID, 1);
        vm.prank(alice);
        market.buy(PID, 1, totalCost);

        vm.prank(alice);
        vm.expectRevert(); // SlippageExceeded
        market.sell(PID, 1, type(uint256).max); // minNet too high
    }

    function test_sell_partialNotRevert() public {
        uint256 shares = 5;
        (uint256 totalCost,) = market.quoteBuy(PID, shares);
        vm.prank(alice);
        market.buy(PID, shares, totalCost);

        // Sell 2 of 5
        (uint256 net,) = market.quoteSell(PID, 2);
        vm.prank(alice);
        market.sell(PID, 2, net);

        (, uint256 supply,,) = market.players(PID);
        assertEq(supply, 3);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  RESERVE INVARIANT: reserve == reserveOf(supply)
    // ══════════════════════════════════════════════════════════════

    function test_reserveInvariant_afterBuys() public {
        // Buy in multiple rounds
        for (uint256 i = 1; i <= 5; i++) {
            (uint256 cost,) = market.quoteBuy(PID, 1);
            vm.prank(alice);
            market.buy(PID, 1, cost);

            (, uint256 supply, uint256 reserve,) = market.players(PID);
            uint256 expected = BondingCurve.reserveOf(supply, BASE, SLOPE);
            assertEq(reserve, expected, "reserve invariant after buy");
        }
    }

    function test_reserveInvariant_afterBuySell() public {
        // Buy 5
        (uint256 cost5,) = market.quoteBuy(PID, 5);
        vm.prank(alice);
        market.buy(PID, 5, cost5);

        // Sell 2
        (uint256 net2,) = market.quoteSell(PID, 2);
        vm.prank(alice);
        market.sell(PID, 2, net2);

        (, uint256 supply, uint256 reserve,) = market.players(PID);
        uint256 expected = BondingCurve.reserveOf(supply, BASE, SLOPE);
        assertEq(reserve, expected, "reserve invariant after buy+sell");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  MONETARY CONSERVATION
    // ══════════════════════════════════════════════════════════════

    function test_monetaryConservation() public {
        // Alice buys 3, Bob buys 2
        (uint256 cost3,) = market.quoteBuy(PID, 3);
        vm.prank(alice);
        market.buy(PID, 3, cost3);

        (uint256 cost2,) = market.quoteBuy(PID, 2);
        vm.prank(bob);
        market.buy(PID, 2, cost2);

        // Alice sells 1
        (uint256 net1,) = market.quoteSell(PID, 1);
        vm.prank(alice);
        market.sell(PID, 1, net1);

        // Conservation: usdt.balanceOf(market) == reserve + dividendBudget + protocolFees
        uint256 marketBal = usdt.balanceOf(address(market));
        (,, uint256 reserve, uint256 divBudget) = market.players(PID);
        uint256 protoFees = market.protocolFees();

        assertEq(marketBal, reserve + divBudget + protoFees, "monetary conservation");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FULL SELL-OFF: any holder can sell all without revert
    // ══════════════════════════════════════════════════════════════

    function test_fullSellOff_noRevert() public {
        // Alice buys 5
        (uint256 cost,) = market.quoteBuy(PID, 5);
        vm.prank(alice);
        market.buy(PID, 5, cost);

        // Bob buys 3
        (uint256 cost2,) = market.quoteBuy(PID, 3);
        vm.prank(bob);
        market.buy(PID, 3, cost2);

        // Bob sells all 3
        (uint256 netBob,) = market.quoteSell(PID, 3);
        vm.prank(bob);
        market.sell(PID, 3, netBob);

        // Alice sells all 5
        (uint256 netAlice,) = market.quoteSell(PID, 5);
        vm.prank(alice);
        market.sell(PID, 5, netAlice);

        (, uint256 supply, uint256 reserve,) = market.players(PID);
        assertEq(supply, 0);
        assertEq(reserve, 0);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FEE SPLIT
    // ══════════════════════════════════════════════════════════════

    function test_feeSplit_noReferrer() public {
        // No referrer set, so referral share goes to protocol
        (uint256 totalCost,) = market.quoteBuy(PID, 1);
        uint256 rawCost = BondingCurve.cost(0, 1, BASE, SLOPE);
        uint256 fee = (rawCost * 300) / 10_000;
        uint256 divShare = (fee * 5_000) / 10_000;   // 50%
        uint256 protoShare = fee - divShare;          // 50% (no referrer, so referral part goes to protocol)

        vm.prank(alice);
        market.buy(PID, 1, totalCost);

        (,,, uint256 divBudget) = market.players(PID);
        assertEq(divBudget, divShare, "dividend budget correct");
        assertEq(market.protocolFees(), protoShare, "protocol fees correct");
    }

    function test_feeSplit_withReferrer() public {
        // Set bob as alice's referrer
        vm.prank(alice);
        market.setReferrer(bob);

        uint256 bobBefore = usdt.balanceOf(bob);

        (uint256 totalCost,) = market.quoteBuy(PID, 1);
        uint256 rawCost = BondingCurve.cost(0, 1, BASE, SLOPE);
        uint256 fee = (rawCost * 300) / 10_000;
        uint256 refShare = (fee * 3_000) / 10_000;   // 30%
        uint256 divShare = (fee * 5_000) / 10_000;   // 50%
        uint256 protoShare = fee - refShare - divShare; // 20%

        vm.prank(alice);
        market.buy(PID, 1, totalCost);

        assertEq(usdt.balanceOf(bob) - bobBefore, refShare, "referrer paid correctly");
        (,,, uint256 divBudget) = market.players(PID);
        assertEq(divBudget, divShare, "dividend budget correct");
        assertEq(market.protocolFees(), protoShare, "protocol fees correct");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  REFERRAL
    // ══════════════════════════════════════════════════════════════

    function test_referrer_selfRevert() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.SelfReferral.selector));
        market.setReferrer(alice);
    }

    function test_referrer_doubleSetRevert() public {
        vm.prank(alice);
        market.setReferrer(bob);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.ReferrerAlreadySet.selector));
        market.setReferrer(carol);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  ADMIN
    // ══════════════════════════════════════════════════════════════

    function test_withdrawProtocolFees() public {
        // Buy to generate fees
        (uint256 totalCost,) = market.quoteBuy(PID, 5);
        vm.prank(alice);
        market.buy(PID, 5, totalCost);

        uint256 fees = market.protocolFees();
        assertTrue(fees > 0, "should have protocol fees");

        uint256 ownerBefore = usdt.balanceOf(owner);
        market.withdrawProtocolFees(owner);
        assertEq(usdt.balanceOf(owner) - ownerBefore, fees);
        assertEq(market.protocolFees(), 0);
    }

    function test_setOracle() public {
        market.setOracle(alice);
        assertEq(market.oracle(), alice);
    }

    function test_setParams() public {
        market.setCurveBase(200e18);
        assertEq(market.curveBase(), 200e18);

        market.setCurveSlope(20e18);
        assertEq(market.curveSlope(), 20e18);

        market.setFeeBps(500);
        assertEq(market.feeBps(), 500);

        market.setFeeWeights(2000, 6000);
        assertEq(market.referralBps(), 2000);
        assertEq(market.divShareBps(), 6000);
    }

    function test_setParams_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        market.setCurveBase(200e18);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FUND DIVIDENDS
    // ══════════════════════════════════════════════════════════════

    function test_fundDividends() public {
        uint256 amount = 100e18;
        vm.prank(alice);
        market.fundDividends(PID, amount);

        (,,, uint256 divBudget) = market.players(PID);
        assertEq(divBudget, amount);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  DISTRIBUTE (oracle)
    // ══════════════════════════════════════════════════════════════

    function test_distribute_onlyOracle() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.NotOperator.selector));
        market.distribute(PID, KickTypes.StatType.GOAL, 50e18);
    }

    function test_distribute_insufficientBudget() public {
        market.setOracle(address(this));

        vm.expectRevert(abi.encodeWithSelector(KickTypes.InsufficientBudget.selector, 0, 50e18));
        market.distribute(PID, KickTypes.StatType.GOAL, 50e18);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FUZZ: RESERVE INVARIANT
    // ══════════════════════════════════════════════════════════════

    function testFuzz_reserveInvariant(uint8 buyShares, uint8 sellShares) public {
        uint256 b = bound(buyShares, 1, 50);
        uint256 s = bound(sellShares, 0, b);

        (uint256 cost,) = market.quoteBuy(PID, b);
        vm.prank(alice);
        market.buy(PID, b, cost);

        if (s > 0) {
            (uint256 net,) = market.quoteSell(PID, s);
            vm.prank(alice);
            market.sell(PID, s, net);
        }

        (, uint256 supply, uint256 reserve,) = market.players(PID);
        uint256 expected = BondingCurve.reserveOf(supply, BASE, SLOPE);
        assertEq(reserve, expected, "fuzz: reserve invariant");
    }

    function testFuzz_monetaryConservation(uint8 buyA, uint8 buyB, uint8 sellA) public {
        uint256 bA = bound(buyA, 1, 30);
        uint256 bB = bound(buyB, 0, 30);
        uint256 sA = bound(sellA, 0, bA);

        // Alice buys
        (uint256 costA,) = market.quoteBuy(PID, bA);
        vm.prank(alice);
        market.buy(PID, bA, costA);

        // Bob buys
        if (bB > 0) {
            (uint256 costB,) = market.quoteBuy(PID, bB);
            vm.prank(bob);
            market.buy(PID, bB, costB);
        }

        // Alice sells some
        if (sA > 0) {
            (uint256 netA,) = market.quoteSell(PID, sA);
            vm.prank(alice);
            market.sell(PID, sA, netA);
        }

        // Check conservation
        uint256 marketBal = usdt.balanceOf(address(market));
        (,, uint256 reserve, uint256 divBudget) = market.players(PID);
        uint256 protoFees = market.protocolFees();

        assertEq(marketBal, reserve + divBudget + protoFees, "fuzz: monetary conservation");
    }
}
