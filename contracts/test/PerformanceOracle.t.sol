// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {PerformanceOracle} from "../src/PerformanceOracle.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

contract PerformanceOracleTest is Test {
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;
    PerformanceOracle oracle;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    uint256 constant PID1 = 1;
    uint256 constant PID2 = 2;

    function setUp() public {
        usdt    = new MockUSDT();
        factory = new PlayerTokenFactory();
        market  = new PlayerMarket(address(usdt), address(factory));
        oracle  = new PerformanceOracle(address(market));

        // Wire oracle
        market.setOracle(address(oracle));

        // List players
        market.listPlayer(PID1, "KickStock Messi", "KMESSI");
        market.listPlayer(PID2, "KickStock Vinicius", "KVINI");

        // Fund accounts
        usdt.mint(alice, 10_000_000e18);
        usdt.mint(bob,   10_000_000e18);

        vm.prank(alice);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(market), type(uint256).max);
    }

    // Helper: buy shares and fund dividends
    function _buyAndFund(uint256 pid, address buyer, uint256 shares, uint256 fundAmt) internal {
        (uint256 cost,) = market.quoteBuy(pid, shares);
        vm.prank(buyer);
        market.buy(pid, shares, cost);

        // Fund dividend budget
        vm.prank(buyer);
        market.fundDividends(pid, fundAmt);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  ACCESS CONTROL
    // ══════════════════════════════════════════════════════════════

    function test_pushStat_onlyOwner() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        vm.prank(alice);
        vm.expectRevert();
        oracle.pushStat(PID1, KickTypes.StatType.GOAL);
    }

    function test_pushBatch_onlyOwner() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        uint256[] memory ids = new uint256[](1);
        KickTypes.StatType[] memory stats = new KickTypes.StatType[](1);
        ids[0] = PID1;
        stats[0] = KickTypes.StatType.GOAL;

        vm.prank(alice);
        vm.expectRevert();
        oracle.pushBatch(ids, stats);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  BUDGET INSUFFICIENT
    // ══════════════════════════════════════════════════════════════

    function test_pushStat_insufficientBudget() public {
        // Buy shares but don't fund enough dividends
        (uint256 cost,) = market.quoteBuy(PID1, 5);
        vm.prank(alice);
        market.buy(PID1, 5, cost);

        // The dividendBudget from fees alone may be small; try to push GOAL = 50e18
        (,,, uint256 divBudget) = market.players(PID1);
        // Only if budget < 50e18 should this revert
        if (divBudget < 50e18) {
            vm.expectRevert(
                abi.encodeWithSelector(KickTypes.InsufficientBudget.selector, divBudget, 50e18)
            );
            oracle.pushStat(PID1, KickTypes.StatType.GOAL);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // ██  SINGLE PUSH
    // ══════════════════════════════════════════════════════════════

    function test_pushStat_goal() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        (,,, uint256 budgetBefore) = market.players(PID1);
        uint256 goalReward = oracle.statReward(KickTypes.StatType.GOAL);

        oracle.pushStat(PID1, KickTypes.StatType.GOAL);

        (,,, uint256 budgetAfter) = market.players(PID1);
        assertEq(budgetBefore - budgetAfter, goalReward, "budget decreased by goal reward");
    }

    function test_pushStat_assist() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        uint256 assistReward = oracle.statReward(KickTypes.StatType.ASSIST);
        (,,, uint256 budgetBefore) = market.players(PID1);

        oracle.pushStat(PID1, KickTypes.StatType.ASSIST);

        (,,, uint256 budgetAfter) = market.players(PID1);
        assertEq(budgetBefore - budgetAfter, assistReward);
    }

    function test_pushStat_cleanSheet() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        uint256 reward = oracle.statReward(KickTypes.StatType.CLEAN_SHEET);
        (,,, uint256 budgetBefore) = market.players(PID1);

        oracle.pushStat(PID1, KickTypes.StatType.CLEAN_SHEET);

        (,,, uint256 budgetAfter) = market.players(PID1);
        assertEq(budgetBefore - budgetAfter, reward);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  BATCH PUSH
    // ══════════════════════════════════════════════════════════════

    function test_pushBatch() public {
        _buyAndFund(PID1, alice, 5, 500e18);
        _buyAndFund(PID2, bob, 5, 500e18);

        uint256[] memory ids = new uint256[](3);
        KickTypes.StatType[] memory stats = new KickTypes.StatType[](3);
        ids[0] = PID1; stats[0] = KickTypes.StatType.GOAL;
        ids[1] = PID1; stats[1] = KickTypes.StatType.ASSIST;
        ids[2] = PID2; stats[2] = KickTypes.StatType.GOAL;

        (,,, uint256 budget1Before) = market.players(PID1);
        (,,, uint256 budget2Before) = market.players(PID2);

        oracle.pushBatch(ids, stats);

        (,,, uint256 budget1After) = market.players(PID1);
        (,,, uint256 budget2After) = market.players(PID2);

        uint256 goalR = oracle.statReward(KickTypes.StatType.GOAL);
        uint256 assistR = oracle.statReward(KickTypes.StatType.ASSIST);

        assertEq(budget1Before - budget1After, goalR + assistR, "PID1 budget decreased by goal+assist");
        assertEq(budget2Before - budget2After, goalR, "PID2 budget decreased by goal");
    }

    function test_pushBatch_skipsZeroReward() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        // RED_CARD has 0 reward by default
        uint256[] memory ids = new uint256[](2);
        KickTypes.StatType[] memory stats = new KickTypes.StatType[](2);
        ids[0] = PID1; stats[0] = KickTypes.StatType.RED_CARD;
        ids[1] = PID1; stats[1] = KickTypes.StatType.GOAL;

        (,,, uint256 budgetBefore) = market.players(PID1);

        oracle.pushBatch(ids, stats);

        (,,, uint256 budgetAfter) = market.players(PID1);
        uint256 goalR = oracle.statReward(KickTypes.StatType.GOAL);
        assertEq(budgetBefore - budgetAfter, goalR, "only goal reward deducted, red card skipped");
    }

    function test_pushBatch_revertMismatchedLength() public {
        uint256[] memory ids = new uint256[](2);
        KickTypes.StatType[] memory stats = new KickTypes.StatType[](1);
        ids[0] = PID1; ids[1] = PID2;
        stats[0] = KickTypes.StatType.GOAL;

        vm.expectRevert(abi.encodeWithSelector(KickTypes.InvalidParam.selector));
        oracle.pushBatch(ids, stats);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  END-TO-END: GOAL → DISTRIBUTE → ACCRUE → CLAIM
    // ══════════════════════════════════════════════════════════════

    function test_endToEnd_goalDistributeAccrueClaim() public {
        // Alice and Bob buy shares
        _buyAndFund(PID1, alice, 5, 500e18);

        (uint256 costBob,) = market.quoteBuy(PID1, 3);
        vm.prank(bob);
        market.buy(PID1, 3, costBob);

        // Get PlayerToken address
        (address tokenAddr,,,) = market.players(PID1);
        PlayerToken token = PlayerToken(tokenAddr);

        // Alice has 5 shares (5e18 tokens), Bob has 3 shares (3e18 tokens)
        uint256 aliceBal = token.balanceOf(alice);
        uint256 bobBal = token.balanceOf(bob);
        assertEq(aliceBal, 5e18);
        assertEq(bobBal, 3e18);

        // Push GOAL stat → 50 mUSDT distributed
        uint256 goalReward = oracle.statReward(KickTypes.StatType.GOAL);
        oracle.pushStat(PID1, KickTypes.StatType.GOAL);

        // Check pending dividends (proportional to holdings)
        uint256 eligibleSupply = token.eligibleSupply();
        assertEq(eligibleSupply, 8e18, "eligible supply = 8 shares");

        uint256 alicePending = token.pending(alice);
        uint256 bobPending = token.pending(bob);

        // Alice should get 5/8 of 50e18, Bob 3/8 of 50e18
        // Due to integer division, check within 1 wei tolerance
        uint256 aliceExpected = (goalReward * 5) / 8;
        uint256 bobExpected = (goalReward * 3) / 8;

        assertApproxEqAbs(alicePending, aliceExpected, 1, "alice pending ~= 5/8 of reward");
        assertApproxEqAbs(bobPending, bobExpected, 1, "bob pending ~= 3/8 of reward");

        // Alice claims
        uint256 aliceUsdtBefore = usdt.balanceOf(alice);
        vm.prank(alice);
        token.claim();
        uint256 aliceClaimed = usdt.balanceOf(alice) - aliceUsdtBefore;
        assertApproxEqAbs(aliceClaimed, aliceExpected, 1, "alice claimed correctly");

        // Bob claims
        uint256 bobUsdtBefore = usdt.balanceOf(bob);
        vm.prank(bob);
        token.claim();
        uint256 bobClaimed = usdt.balanceOf(bob) - bobUsdtBefore;
        assertApproxEqAbs(bobClaimed, bobExpected, 1, "bob claimed correctly");
    }

    function test_endToEnd_multipleStatsAccumulate() public {
        _buyAndFund(PID1, alice, 10, 1000e18);

        (address tokenAddr,,,) = market.players(PID1);
        PlayerToken token = PlayerToken(tokenAddr);

        // Push GOAL + ASSIST
        oracle.pushStat(PID1, KickTypes.StatType.GOAL);
        oracle.pushStat(PID1, KickTypes.StatType.ASSIST);

        uint256 total = oracle.statReward(KickTypes.StatType.GOAL) + oracle.statReward(KickTypes.StatType.ASSIST);

        uint256 pending = token.pending(alice);
        assertApproxEqAbs(pending, total, 1, "accumulated both stats");

        vm.prank(alice);
        uint256 claimed = token.claim();
        assertApproxEqAbs(claimed, total, 1, "claimed accumulated amount");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  ADMIN: setStatReward / setMarket
    // ══════════════════════════════════════════════════════════════

    function test_setStatReward() public {
        oracle.setStatReward(KickTypes.StatType.GOAL, 100e18);
        assertEq(oracle.statReward(KickTypes.StatType.GOAL), 100e18);
    }

    function test_setStatReward_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setStatReward(KickTypes.StatType.GOAL, 100e18);
    }

    function test_setMarket() public {
        address newMarket = makeAddr("newMarket");
        oracle.setMarket(newMarket);
        assertEq(address(oracle.market()), newMarket);
    }

    function test_setMarket_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setMarket(makeAddr("x"));
    }

    function test_setMarket_revertZero() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.InvalidParam.selector));
        oracle.setMarket(address(0));
    }

    // ══════════════════════════════════════════════════════════════
    // ██  DEFAULT REWARDS
    // ══════════════════════════════════════════════════════════════

    function test_defaultRewards() public view {
        assertEq(oracle.statReward(KickTypes.StatType.GOAL), 50e18);
        assertEq(oracle.statReward(KickTypes.StatType.ASSIST), 25e18);
        assertEq(oracle.statReward(KickTypes.StatType.CLEAN_SHEET), 20e18);
        assertEq(oracle.statReward(KickTypes.StatType.MOTM), 30e18);
        assertEq(oracle.statReward(KickTypes.StatType.RED_CARD), 0);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  ZERO-REWARD STAT REVERTS ON SINGLE PUSH
    // ══════════════════════════════════════════════════════════════

    function test_pushStat_zeroRewardReverts() public {
        _buyAndFund(PID1, alice, 5, 500e18);

        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        oracle.pushStat(PID1, KickTypes.StatType.RED_CARD);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FUZZ: DIVIDEND CONSERVATION
    // ══════════════════════════════════════════════════════════════

    function testFuzz_dividendConservation(uint8 sharesA, uint8 sharesB) public {
        uint256 sA = bound(sharesA, 1, 20);
        uint256 sB = bound(sharesB, 1, 20);

        _buyAndFund(PID1, alice, sA, 500e18);

        (uint256 costB,) = market.quoteBuy(PID1, sB);
        vm.prank(bob);
        market.buy(PID1, sB, costB);

        (address tokenAddr,,,) = market.players(PID1);
        PlayerToken token = PlayerToken(tokenAddr);

        // Push GOAL
        oracle.pushStat(PID1, KickTypes.StatType.GOAL);

        uint256 goalReward = oracle.statReward(KickTypes.StatType.GOAL);

        // Sum of pending should equal reward (within rounding)
        uint256 totalPending = token.pending(alice) + token.pending(bob);
        // Rounding dust up to sA+sB-1 wei is expected from divide-before-multiply
        assertApproxEqAbs(totalPending, goalReward, sA + sB, "fuzz: dividend conservation");
    }
}
