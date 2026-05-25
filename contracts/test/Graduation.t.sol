// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {PlayerAMM} from "../src/PlayerAMM.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @title GraduationTest
/// @notice Tests for M7 graduation mechanics: threshold check, AMM seeding,
///         exclusion of AMM from dividends, bonding curve closure after graduation.
contract GraduationTest is Test {
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    uint256 constant PID = 1;
    uint256 constant BASE = 100e18;
    uint256 constant SLOPE = 10e18;

    function setUp() public {
        usdt    = new MockUSDT();
        factory = new PlayerTokenFactory();
        market  = new PlayerMarket(address(usdt), address(factory));

        // List player 1
        market.listPlayer(PID, "KickStock Messi", "KMESSI");

        // Fund accounts generously
        usdt.mint(alice, 100_000_000e18);
        usdt.mint(bob,   100_000_000e18);

        vm.prank(alice);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(market), type(uint256).max);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  HELPER: buy enough shares to push reserve above threshold
    // ══════════════════════════════════════════════════════════════

    /// @dev Buy shares until reserve >= GRADUATION_THRESHOLD.
    function _buyToThreshold() internal {
        // Binary search for the number of shares needed
        // reserve(S) = S * BASE + SLOPE * S*(S-1)/2
        // We need reserve(S) >= 50_000e18
        // 50000e18 = S*100e18 + 10e18 * S*(S-1)/2
        // 50000 = 100S + 5S^2 - 5S = 5S^2 + 95S
        // S ≈ 90 shares (5*8100 + 95*90 = 40500 + 8550 = 49050, need more)
        // S = 91: 5*8281 + 95*91 = 41405 + 8645 = 50050 ✓
        uint256 shares = 91;
        (uint256 cost,) = market.quoteBuy(PID, shares);
        vm.prank(alice);
        market.buy(PID, shares, cost);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  GRADUATION THRESHOLD
    // ══════════════════════════════════════════════════════════════

    function test_cannotGraduate_belowThreshold() public {
        // Buy a small amount (not enough for graduation)
        (uint256 cost,) = market.quoteBuy(PID, 10);
        vm.prank(alice);
        market.buy(PID, 10, cost);

        assertFalse(market.canGraduate(PID), "should not be graduable below threshold");

        vm.expectRevert();
        market.graduate(PID);
    }

    function test_graduate_atThreshold() public {
        _buyToThreshold();

        // Verify reserve is at or above threshold
        (,, uint256 reserve,) = market.players(PID);
        assertGe(reserve, KickTypes.GRADUATION_THRESHOLD, "reserve should be >= threshold");

        assertTrue(market.canGraduate(PID), "should be graduable at threshold");

        // Graduate
        market.graduate(PID);

        assertTrue(market.graduated(PID), "player should be graduated");
        assertTrue(market.playerAmm(PID) != address(0), "AMM should be deployed");
    }

    function test_graduate_anyoneCanTrigger() public {
        _buyToThreshold();

        // Bob (not owner) triggers graduation
        vm.prank(bob);
        market.graduate(PID);

        assertTrue(market.graduated(PID));
    }

    function test_graduate_cannotGraduateTwice() public {
        _buyToThreshold();
        market.graduate(PID);

        vm.expectRevert(abi.encodeWithSelector(KickTypes.AlreadyGraduated.selector, PID));
        market.graduate(PID);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  SEED RATIO = CURRENT CURVE PRICE
    // ══════════════════════════════════════════════════════════════

    function test_graduate_seedRatioMatchesCurvePrice() public {
        _buyToThreshold();

        (, uint256 supply, uint256 reserve,) = market.players(PID);
        uint256 curPrice = BondingCurve.priceAt(supply, BASE, SLOPE);

        market.graduate(PID);

        address ammAddr = market.playerAmm(PID);
        PlayerAMM amm = PlayerAMM(ammAddr);

        // AMM reserves: usdt seed = old reserve, token seed = reserve / curPrice * 1e18
        uint256 expectedTokenSeed = (reserve * KickTypes.SHARE_UNIT) / curPrice;

        // Check AMM reserves match seed values
        // reserveUsdt should be approximately `reserve`
        // reserveToken should be approximately `expectedTokenSeed`
        assertEq(amm.reserveUsdt(), reserve, "AMM USDT reserve should equal old bonding curve reserve");
        assertEq(amm.reserveToken(), expectedTokenSeed, "AMM token reserve should match seed at curve price");

        // Verify price in AMM is approx curPrice (USDT/Token) — small rounding due to integer division
        uint256 ammPrice = amm.price();
        // Allow 1 basis point of rounding error
        assertApproxEqAbs(ammPrice, curPrice, curPrice / 1e15, "AMM price should approx equal curve price at graduation");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  AMM EXCLUDED FROM DIVIDENDS
    // ══════════════════════════════════════════════════════════════

    function test_graduate_ammExcludedFromDividends() public {
        _buyToThreshold();
        market.graduate(PID);

        address ammAddr = market.playerAmm(PID);
        (address tokenAddr,,,) = market.players(PID);
        PlayerToken token = PlayerToken(tokenAddr);

        assertTrue(token.excluded(ammAddr), "AMM should be excluded from dividends");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  BONDING CURVE CLOSED AFTER GRADUATION
    // ══════════════════════════════════════════════════════════════

    function test_graduate_curveBuyClosed() public {
        _buyToThreshold();
        market.graduate(PID);

        // Try to buy on bonding curve — should revert
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.AlreadyGraduated.selector, PID));
        market.buy(PID, 1, type(uint256).max);
    }

    function test_graduate_curveSellClosed() public {
        _buyToThreshold();
        market.graduate(PID);

        // Try to sell on bonding curve — should revert
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.AlreadyGraduated.selector, PID));
        market.sell(PID, 1, 0);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  RESERVE DRAINED AFTER GRADUATION
    // ══════════════════════════════════════════════════════════════

    function test_graduate_reserveDrained() public {
        _buyToThreshold();
        market.graduate(PID);

        (,, uint256 reserve,) = market.players(PID);
        assertEq(reserve, 0, "bonding curve reserve should be 0 after graduation");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  GRADUATION PROGRESS
    // ══════════════════════════════════════════════════════════════

    function test_graduationProgress() public {
        // No shares bought yet → 0%
        uint256 progress = market.graduationProgress(PID);
        assertEq(progress, 0, "progress should be 0 with no shares");

        // Buy some shares
        (uint256 cost,) = market.quoteBuy(PID, 10);
        vm.prank(alice);
        market.buy(PID, 10, cost);

        progress = market.graduationProgress(PID);
        assertTrue(progress > 0 && progress < KickTypes.BPS, "progress should be between 0 and 10000");

        // Buy to threshold
        // Need to reach 50000e18 reserve total
        // Already have some, buy more
        (,, uint256 currentReserve,) = market.players(PID);
        // Keep buying until threshold reached
        while (currentReserve < KickTypes.GRADUATION_THRESHOLD) {
            uint256 buyAmount = 10;
            (uint256 c,) = market.quoteBuy(PID, buyAmount);
            vm.prank(alice);
            market.buy(PID, buyAmount, c);
            (,, currentReserve,) = market.players(PID);
        }

        progress = market.graduationProgress(PID);
        assertGe(progress, KickTypes.BPS, "progress should be >= 10000 at threshold");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  POST-GRADUATION: AMM IS FUNCTIONAL
    // ══════════════════════════════════════════════════════════════

    function test_graduate_ammSwapWorks() public {
        _buyToThreshold();
        market.graduate(PID);

        address ammAddr = market.playerAmm(PID);
        PlayerAMM amm = PlayerAMM(ammAddr);

        // Bob approves and swaps USDT for PlayerToken
        vm.prank(bob);
        usdt.approve(ammAddr, type(uint256).max);

        uint256 swapIn = 100e18;
        vm.prank(bob);
        uint256 tokenOut = amm.swapUsdtForShares(swapIn, 0);

        assertTrue(tokenOut > 0, "should receive tokens from swap");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FUZZ: GRADUATION DOES NOT BREAK INVARIANTS
    // ══════════════════════════════════════════════════════════════

    function testFuzz_graduate_preservesTokenSupplyConsistency(uint8 extraShares) public {
        uint256 extra = bound(extraShares, 0, 20);

        // Buy exactly to threshold (91 shares)
        _buyToThreshold();

        // Buy some extra
        if (extra > 0) {
            (uint256 cost,) = market.quoteBuy(PID, extra);
            vm.prank(alice);
            market.buy(PID, extra, cost);
        }

        (address tokenAddr, uint256 supplyBefore,,) = market.players(PID);
        PlayerToken token = PlayerToken(tokenAddr);
        uint256 totalSupplyBefore = token.totalSupply();

        // Alice holds all shares (91 + extra) * SHARE_UNIT
        uint256 aliceSharesBefore = token.balanceOf(alice);
        assertEq(aliceSharesBefore, supplyBefore * KickTypes.SHARE_UNIT, "alice should hold all shares");

        // Graduate
        market.graduate(PID);

        // After graduation: new tokens minted for AMM seed
        uint256 totalSupplyAfter = token.totalSupply();
        assertTrue(totalSupplyAfter > totalSupplyBefore, "total supply should increase with AMM seed");

        // Alice should still hold her original shares (unchanged)
        uint256 aliceSharesAfter = token.balanceOf(alice);
        assertEq(aliceSharesAfter, aliceSharesBefore, "alice shares unchanged after graduation");
    }
}
