// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @notice Comprehensive tests for PlayerToken:
///   - Dividend accumulator correctness (proportional, anti-siphon, transfer semantics)
///   - Excluded addresses (AMM pool, market) don't count in eligibleSupply
///   - Claim mechanics (settle, withdraw, re-claim after new accrual)
///   - Mint/burn access control
///   - Factory clone deployment
contract PlayerTokenTest is Test {
    MockUSDT internal usdt;
    PlayerTokenFactory internal factory;
    PlayerToken internal token;

    address internal market;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal ammPool = address(0xAA11);

    function setUp() public {
        market = address(this); // test contract acts as market
        usdt = new MockUSDT();
        factory = new PlayerTokenFactory();

        // Deploy a PlayerToken clone
        address tokenAddr = factory.createToken(1, "KickStock Messi", "KMESSI", market, address(usdt));
        token = PlayerToken(tokenAddr);
    }

    // ── Metadata ───────────────────────────────────────────────────

    function test_metadata() public view {
        assertEq(token.name(), "KickStock Messi");
        assertEq(token.symbol(), "KMESSI");
        assertEq(token.decimals(), 18);
        assertEq(token.market(), market);
        assertEq(address(token.usdt()), address(usdt));
    }

    function test_cannotReinitialize() public {
        vm.expectRevert("already initialized");
        token.initialize("Hack", "HACK", address(1), address(2));
    }

    // ── Mint / Burn access ─────────────────────────────────────────

    function test_mintShares_onlyMarket() public {
        token.mintShares(alice, 100e18);
        assertEq(token.balanceOf(alice), 100e18);

        vm.prank(alice);
        vm.expectRevert(KickTypes.NotMarket.selector);
        token.mintShares(alice, 1e18);
    }

    function test_burnShares_onlyMarket() public {
        token.mintShares(alice, 100e18);
        token.burnShares(alice, 50e18);
        assertEq(token.balanceOf(alice), 50e18);

        vm.prank(alice);
        vm.expectRevert(KickTypes.NotMarket.selector);
        token.burnShares(alice, 1e18);
    }

    function test_burnShares_insufficientReverts() public {
        token.mintShares(alice, 10e18);
        vm.expectRevert(
            abi.encodeWithSelector(KickTypes.InsufficientShares.selector, 10e18, 20e18)
        );
        token.burnShares(alice, 20e18);
    }

    // ── EligibleSupply tracking ────────────────────────────────────

    function test_eligibleSupply_tracksMints() public {
        token.mintShares(alice, 100e18);
        assertEq(token.eligibleSupply(), 100e18);
        token.mintShares(bob, 50e18);
        assertEq(token.eligibleSupply(), 150e18);
    }

    function test_eligibleSupply_tracksBurns() public {
        token.mintShares(alice, 100e18);
        token.burnShares(alice, 30e18);
        assertEq(token.eligibleSupply(), 70e18);
    }

    function test_eligibleSupply_excludedNotCounted() public {
        token.mintShares(alice, 100e18);
        token.setExcluded(ammPool, true);
        token.mintShares(ammPool, 200e18);
        // AMM pool's 200 tokens should not be in eligibleSupply
        assertEq(token.eligibleSupply(), 100e18);
        assertEq(token.totalSupply(), 300e18);
    }

    function test_setExcluded_removesFromEligible() public {
        token.mintShares(alice, 100e18);
        assertEq(token.eligibleSupply(), 100e18);

        // Exclude alice
        token.setExcluded(alice, true);
        assertEq(token.eligibleSupply(), 0);

        // Re-include alice
        token.setExcluded(alice, false);
        assertEq(token.eligibleSupply(), 100e18);
    }

    function test_setExcluded_onlyMarket() public {
        vm.prank(alice);
        vm.expectRevert(KickTypes.NotMarket.selector);
        token.setExcluded(ammPool, true);
    }

    // ── Dividend: proportional distribution ────────────────────────

    function test_dividend_proportionalSplit() public {
        token.mintShares(alice, 30e18);
        token.mintShares(bob, 70e18);

        // Fund and accrue 100 USDT
        usdt.mint(address(token), 100e18);
        token.accrue(100e18);

        assertEq(token.pending(alice), 30e18, "alice gets 30%");
        assertEq(token.pending(bob), 70e18, "bob gets 70%");
    }

    function test_dividend_equalSplit() public {
        token.mintShares(alice, 100e18);
        token.mintShares(bob, 100e18);

        usdt.mint(address(token), 50e18);
        token.accrue(50e18);

        assertEq(token.pending(alice), 25e18, "alice 50%");
        assertEq(token.pending(bob), 25e18, "bob 50%");
    }

    // ── Dividend: anti-siphon (late buyer gets nothing) ────────────

    function test_antiSiphon_lateBuyerGetsNothing() public {
        token.mintShares(alice, 100e18);

        // Distribute before carol joins
        usdt.mint(address(token), 50e18);
        token.accrue(50e18);

        // Carol buys AFTER the distribution
        token.mintShares(carol, 100e18);

        assertEq(token.pending(carol), 0, "late buyer must have zero pending");
        assertEq(token.pending(alice), 50e18, "alice keeps the whole distribution");
    }

    // ── Dividend: transfer carries future, not past ────────────────

    function test_transferCarriesFutureNotPast() public {
        token.mintShares(alice, 100e18);

        // First distribution: alice earns 50
        usdt.mint(address(token), 50e18);
        token.accrue(50e18);

        // Alice transfers all to bob
        vm.prank(alice);
        token.transfer(bob, 100e18);

        // Second distribution: only bob eligible
        usdt.mint(address(token), 50e18);
        token.accrue(50e18);

        assertEq(token.pending(alice), 50e18, "alice keeps first distribution");
        assertEq(token.pending(bob), 50e18, "bob earns only the second");
    }

    function test_transferPartial_dividendsSplit() public {
        token.mintShares(alice, 100e18);

        // First distribution
        usdt.mint(address(token), 100e18);
        token.accrue(100e18);

        // Alice transfers half to bob
        vm.prank(alice);
        token.transfer(bob, 50e18);

        // Second distribution: 50/50
        usdt.mint(address(token), 100e18);
        token.accrue(100e18);

        // Alice: 100 from first + 50 from second = 150
        assertEq(token.pending(alice), 150e18, "alice: 100 + 50");
        // Bob: 0 from first + 50 from second = 50
        assertEq(token.pending(bob), 50e18, "bob: 0 + 50");
    }

    // ── Dividend: excluded addresses ───────────────────────────────

    function test_excluded_dontEarnDividends() public {
        token.mintShares(alice, 100e18);
        token.setExcluded(ammPool, true);
        token.mintShares(ammPool, 100e18);

        // Only alice's 100 shares are eligible
        usdt.mint(address(token), 100e18);
        token.accrue(100e18);

        assertEq(token.pending(alice), 100e18, "alice gets all");
        assertEq(token.pending(ammPool), 0, "excluded gets nothing");
    }

    function test_transferToExcluded_adjustsEligible() public {
        token.mintShares(alice, 100e18);
        token.setExcluded(ammPool, true);

        // Alice sends to excluded pool
        vm.prank(alice);
        token.transfer(ammPool, 40e18);

        // eligibleSupply should be 60 (alice's remaining)
        assertEq(token.eligibleSupply(), 60e18);

        usdt.mint(address(token), 60e18);
        token.accrue(60e18);

        assertEq(token.pending(alice), 60e18, "alice gets all on her 60 shares");
        assertEq(token.pending(ammPool), 0, "excluded gets nothing");
    }

    // ── Claim ──────────────────────────────────────────────────────

    function test_claim_withdrawsDividends() public {
        token.mintShares(alice, 100e18);

        usdt.mint(address(token), 100e18);
        token.accrue(100e18);

        uint256 balBefore = usdt.balanceOf(alice);
        vm.prank(alice);
        uint256 claimed = token.claim();

        assertEq(claimed, 100e18, "claimed amount");
        assertEq(usdt.balanceOf(alice) - balBefore, 100e18, "USDT received");
        assertEq(token.pending(alice), 0, "pending zeroed after claim");
    }

    function test_claim_canReclaimAfterNewAccrual() public {
        token.mintShares(alice, 100e18);

        // First round
        usdt.mint(address(token), 50e18);
        token.accrue(50e18);
        vm.prank(alice);
        token.claim();
        assertEq(usdt.balanceOf(alice), 50e18);

        // Second round
        usdt.mint(address(token), 30e18);
        token.accrue(30e18);
        vm.prank(alice);
        token.claim();
        assertEq(usdt.balanceOf(alice), 80e18);
    }

    function test_claim_zeroIfNothingPending() public {
        token.mintShares(alice, 100e18);
        vm.prank(alice);
        uint256 claimed = token.claim();
        assertEq(claimed, 0);
    }

    // ── Accrue edge cases ──────────────────────────────────────────

    function test_accrue_revertsOnZeroEligible() public {
        // No tokens minted yet
        vm.expectRevert(
            abi.encodeWithSelector(KickTypes.NoEligibleSupply.selector, 0)
        );
        token.accrue(100e18);
    }

    function test_accrue_onlyMarket() public {
        token.mintShares(alice, 100e18);
        vm.prank(alice);
        vm.expectRevert(KickTypes.NotMarket.selector);
        token.accrue(100e18);
    }

    // ── Factory clone tests ────────────────────────────────────────

    function test_factory_createsUniqueClones() public {
        address token2 = factory.createToken(2, "KickStock Ronaldo", "KRONALDO", market, address(usdt));
        assertTrue(token2 != address(token), "different addresses");
        assertEq(PlayerToken(token2).name(), "KickStock Ronaldo");
        assertEq(PlayerToken(token2).symbol(), "KRONALDO");
    }

    function test_factory_implementationIsInitialized() public {
        address impl = factory.implementation();
        vm.expectRevert("already initialized");
        PlayerToken(impl).initialize("X", "X", address(1), address(2));
    }

    // ── Fuzz: dividend conservation ────────────────────────────────

    function testFuzz_dividendConservation(uint256 aliceAmt, uint256 bobAmt, uint256 divAmt) public {
        aliceAmt = bound(aliceAmt, 1e18, 1_000_000e18);
        bobAmt = bound(bobAmt, 1e18, 1_000_000e18);
        divAmt = bound(divAmt, 1, 1_000_000e18);

        token.mintShares(alice, aliceAmt);
        token.mintShares(bob, bobAmt);

        usdt.mint(address(token), divAmt);
        token.accrue(divAmt);

        uint256 totalPending = token.pending(alice) + token.pending(bob);
        // Never overpay
        assertLe(totalPending, divAmt, "overpay");
        // Bounded dust
        uint256 dustBound = (aliceAmt + bobAmt) / 1e18 + 3;
        assertGe(totalPending + dustBound, divAmt, "too much dust");
    }

    function testFuzz_antiSiphon(uint256 existingBal, uint256 newBal, uint256 divAmt) public {
        existingBal = bound(existingBal, 1e18, 1_000_000e18);
        newBal = bound(newBal, 1e18, 1_000_000e18);
        divAmt = bound(divAmt, 1e6, 1_000_000e18);

        // Alice holds before distribution
        token.mintShares(alice, existingBal);
        usdt.mint(address(token), divAmt);
        token.accrue(divAmt);

        // Bob joins after
        token.mintShares(bob, newBal);

        // Bob should have zero pending from this distribution
        assertEq(token.pending(bob), 0, "new buyer siphoned dividends");
    }
}
