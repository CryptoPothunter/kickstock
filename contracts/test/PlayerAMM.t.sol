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

/// @title PlayerAMMTest
/// @notice Tests for M7 PlayerAMM: constant product invariant, LP mint/burn,
///         fee distribution, minimum liquidity lock, swap mechanics.
contract PlayerAMMTest is Test {
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;
    PlayerAMM amm;
    PlayerToken token;

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

        market.listPlayer(PID, "KickStock Messi", "KMESSI");

        // Fund accounts
        usdt.mint(alice, 100_000_000e18);
        usdt.mint(bob,   100_000_000e18);
        usdt.mint(carol, 100_000_000e18);

        vm.prank(alice);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(market), type(uint256).max);
        vm.prank(carol);
        usdt.approve(address(market), type(uint256).max);

        // Buy to threshold and graduate
        _buyToThresholdAndGraduate();
    }

    function _buyToThresholdAndGraduate() internal {
        // S = 91 shares gives reserve ≈ 50,050 > 50,000
        uint256 shares = 91;
        (uint256 cost,) = market.quoteBuy(PID, shares);
        vm.prank(alice);
        market.buy(PID, shares, cost);

        // Graduate
        market.graduate(PID);

        amm = PlayerAMM(market.playerAmm(PID));
        (address tokenAddr,,,) = market.players(PID);
        token = PlayerToken(tokenAddr);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  INITIALIZATION
    // ══════════════════════════════════════════════════════════════

    function test_amm_initialized() public view {
        assertTrue(amm.initialized());
        assertTrue(amm.reserveUsdt() > 0);
        assertTrue(amm.reserveToken() > 0);
        assertTrue(amm.totalSupply() > 0);
    }

    function test_amm_minimumLiquidityLocked() public view {
        // MINIMUM_LIQUIDITY (1000) should be locked at dead address
        uint256 deadBalance = amm.balanceOf(address(0xdead));
        assertEq(deadBalance, KickTypes.MINIMUM_LIQUIDITY, "minimum liquidity should be locked");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  SWAP USDT → TOKEN
    // ══════════════════════════════════════════════════════════════

    function test_swapUsdtForShares() public {
        uint256 kBefore = amm.reserveUsdt() * amm.reserveToken();

        uint256 swapAmount = 1_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);

        vm.prank(bob);
        uint256 tokenOut = amm.swapUsdtForShares(swapAmount, 0);

        assertTrue(tokenOut > 0, "should receive tokens");

        // x*y >= k (with fee, k should increase)
        uint256 kAfter = amm.reserveUsdt() * amm.reserveToken();
        assertGe(kAfter, kBefore, "k should not decrease after swap (fee increases it)");
    }

    function test_swapUsdtForShares_slippageProtection() public {
        uint256 swapAmount = 100e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);

        // Set an impossibly high minOut
        vm.prank(bob);
        vm.expectRevert();
        amm.swapUsdtForShares(swapAmount, type(uint256).max);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  SWAP TOKEN → USDT
    // ══════════════════════════════════════════════════════════════

    function test_swapSharesForUsdt() public {
        // Alice has tokens from initial buy — she can swap them for USDT
        uint256 aliceTokens = token.balanceOf(alice);
        assertTrue(aliceTokens > 0, "alice should have tokens");

        uint256 swapAmount = aliceTokens / 10; // swap 10% of holdings
        uint256 kBefore = amm.reserveUsdt() * amm.reserveToken();

        vm.prank(alice);
        token.approve(address(amm), swapAmount);

        vm.prank(alice);
        uint256 usdtOut = amm.swapSharesForUsdt(swapAmount, 0);

        assertTrue(usdtOut > 0, "should receive USDT");

        uint256 kAfter = amm.reserveUsdt() * amm.reserveToken();
        assertGe(kAfter, kBefore, "k should not decrease after swap");
    }

    function test_swapSharesForUsdt_slippageProtection() public {
        uint256 swapAmount = 1e18;
        vm.prank(alice);
        token.approve(address(amm), swapAmount);

        vm.prank(alice);
        vm.expectRevert();
        amm.swapSharesForUsdt(swapAmount, type(uint256).max);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  CONSTANT PRODUCT: x*y >= k AFTER SWAP (WITH FEE)
    // ══════════════════════════════════════════════════════════════

    function testFuzz_constantProduct_usdtForShares(uint8 pctOfReserve) public {
        uint256 pct = bound(pctOfReserve, 1, 50); // 1-50% of USDT reserve
        uint256 swapAmount = (amm.reserveUsdt() * pct) / 100;
        if (swapAmount == 0) return;

        uint256 kBefore = amm.reserveUsdt() * amm.reserveToken();

        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);

        vm.prank(bob);
        amm.swapUsdtForShares(swapAmount, 0);

        uint256 kAfter = amm.reserveUsdt() * amm.reserveToken();
        assertGe(kAfter, kBefore, "fuzz: k must not decrease");
    }

    function testFuzz_constantProduct_sharesForUsdt(uint8 pctOfReserve) public {
        uint256 pct = bound(pctOfReserve, 1, 50);
        uint256 swapAmount = (amm.reserveToken() * pct) / 100;
        if (swapAmount == 0) return;

        // Get tokens for bob: first swap USDT → token
        uint256 usdtToSwap = amm.reserveUsdt() * 2; // enough to get tokens
        vm.prank(bob);
        usdt.approve(address(amm), usdtToSwap);
        vm.prank(bob);
        amm.swapUsdtForShares(usdtToSwap, 0);

        // Now swap tokens back
        uint256 bobTokens = token.balanceOf(bob);
        uint256 actualSwap = swapAmount > bobTokens ? bobTokens : swapAmount;
        if (actualSwap == 0) return;

        uint256 kBefore = amm.reserveUsdt() * amm.reserveToken();

        vm.prank(bob);
        token.approve(address(amm), actualSwap);
        vm.prank(bob);
        amm.swapSharesForUsdt(actualSwap, 0);

        uint256 kAfter = amm.reserveUsdt() * amm.reserveToken();
        assertGe(kAfter, kBefore, "fuzz: k must not decrease");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  LP: ADD LIQUIDITY
    // ══════════════════════════════════════════════════════════════

    function test_addLiquidity() public {
        // Bob needs both USDT and PlayerToken to add liquidity
        // First get some tokens via swap
        uint256 swapUsdt = 5_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapUsdt);
        vm.prank(bob);
        amm.swapUsdtForShares(swapUsdt, 0);

        // Now add liquidity
        uint256 usdtToAdd = 1_000e18;
        uint256 expectedTokenAmount = (usdtToAdd * amm.reserveToken()) / amm.reserveUsdt();

        vm.prank(bob);
        usdt.approve(address(amm), usdtToAdd);
        vm.prank(bob);
        token.approve(address(amm), expectedTokenAmount + 1e18); // small buffer

        uint256 lpBefore = amm.balanceOf(bob);
        vm.prank(bob);
        uint256 lpMinted = amm.addLiquidity(usdtToAdd, 0);

        assertTrue(lpMinted > 0, "should mint LP tokens");
        assertEq(amm.balanceOf(bob) - lpBefore, lpMinted, "LP balance should increase");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  LP: REMOVE LIQUIDITY
    // ══════════════════════════════════════════════════════════════

    function test_removeLiquidity() public {
        // First add liquidity via bob
        uint256 swapUsdt = 5_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapUsdt);
        vm.prank(bob);
        amm.swapUsdtForShares(swapUsdt, 0);

        uint256 usdtToAdd = 1_000e18;
        uint256 expectedToken = (usdtToAdd * amm.reserveToken()) / amm.reserveUsdt();
        vm.prank(bob);
        usdt.approve(address(amm), usdtToAdd);
        vm.prank(bob);
        token.approve(address(amm), expectedToken + 1e18);
        vm.prank(bob);
        amm.addLiquidity(usdtToAdd, 0);

        // Remove half LP
        uint256 lpBal = amm.balanceOf(bob);
        uint256 removeAmount = lpBal / 2;

        uint256 usdtBefore = usdt.balanceOf(bob);
        uint256 tokenBefore = token.balanceOf(bob);

        vm.prank(bob);
        (uint256 usdtOut, uint256 tokenOut) = amm.removeLiquidity(removeAmount, 0, 0);

        assertTrue(usdtOut > 0, "should receive USDT");
        assertTrue(tokenOut > 0, "should receive tokens");
        assertEq(usdt.balanceOf(bob) - usdtBefore, usdtOut, "USDT received matches");
        assertEq(token.balanceOf(bob) - tokenBefore, tokenOut, "token received matches");
        assertEq(lpBal - amm.balanceOf(bob), removeAmount, "LP burned correctly");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  LP MINT/BURN PROPORTIONAL
    // ══════════════════════════════════════════════════════════════

    function test_lpMintBurnProportional() public {
        // Get tokens for bob
        uint256 swapUsdt = 10_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapUsdt);
        vm.prank(bob);
        amm.swapUsdtForShares(swapUsdt, 0);

        uint256 rU0 = amm.reserveUsdt();
        uint256 rT0 = amm.reserveToken();
        uint256 supply0 = amm.totalSupply();

        // Add liquidity = 10% of current USDT reserve
        uint256 usdtAdd = rU0 / 10;
        uint256 tokenAdd = (usdtAdd * rT0) / rU0;

        vm.prank(bob);
        usdt.approve(address(amm), usdtAdd);
        vm.prank(bob);
        token.approve(address(amm), tokenAdd + 1e18);
        vm.prank(bob);
        uint256 lpMinted = amm.addLiquidity(usdtAdd, 0);

        // LP minted should be ~10% of total supply
        // lpMinted = usdtAdd * totalSupply / reserveUsdt ≈ 10%
        assertApproxEqRel(lpMinted, supply0 / 10, 0.01e18, "LP minted should be approx 10pct of supply");

        // Remove all LP → should get back proportional amounts
        vm.prank(bob);
        (uint256 usdtBack, uint256 tokenBack) = amm.removeLiquidity(lpMinted, 0, 0);

        assertApproxEqRel(usdtBack, usdtAdd, 0.01e18, "USDT back should approx equal USDT added");
        assertApproxEqRel(tokenBack, tokenAdd, 0.01e18, "token back should approx equal token added");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FEE DISTRIBUTION
    // ══════════════════════════════════════════════════════════════

    function test_feeDistribution_swapUsdtForShares() public {
        uint256 swapAmount = 10_000e18;
        uint256 expectedFee = (swapAmount * KickTypes.AMM_FEE_BPS) / KickTypes.BPS; // 1%
        uint256 expectedProtoFee = (expectedFee * KickTypes.AMM_PROTO_BPS) / KickTypes.BPS; // 10% of fee

        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);

        uint256 protoBefore = amm.protocolFeesUsdt();

        vm.prank(bob);
        amm.swapUsdtForShares(swapAmount, 0);

        uint256 protoAfter = amm.protocolFeesUsdt();

        // Protocol fee should be ~10% of the 1% swap fee
        assertEq(protoAfter - protoBefore, expectedProtoFee, "protocol fee should be 10% of swap fee");
    }

    function test_feeDistribution_dividendPortion() public {
        // Track PlayerToken accDivPerShare before and after swap
        uint256 accBefore = token.accDivPerShare();

        uint256 swapAmount = 10_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);
        vm.prank(bob);
        amm.swapUsdtForShares(swapAmount, 0);

        uint256 accAfter = token.accDivPerShare();

        // Dividend portion (30% of 1% fee) should have been accrued
        assertTrue(accAfter > accBefore, "accDivPerShare should increase from swap fee dividend");
    }

    function test_feeDistribution_lpPortionStaysInPool() public {
        uint256 rUBefore = amm.reserveUsdt();
        uint256 swapAmount = 10_000e18;
        uint256 fee = (swapAmount * KickTypes.AMM_FEE_BPS) / KickTypes.BPS;
        uint256 afterFee = swapAmount - fee;
        uint256 lpFee = (fee * KickTypes.AMM_LP_BPS) / KickTypes.BPS;

        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);
        vm.prank(bob);
        amm.swapUsdtForShares(swapAmount, 0);

        uint256 rUAfter = amm.reserveUsdt();

        // USDT reserve should increase by (amountAfterFee + lpFee)
        assertEq(rUAfter, rUBefore + afterFee + lpFee, "LP fee should stay in reserve");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  EDGE CASES
    // ══════════════════════════════════════════════════════════════

    function test_swap_zeroAmountReverts() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        amm.swapUsdtForShares(0, 0);

        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        amm.swapSharesForUsdt(0, 0);
    }

    function test_addLiquidity_zeroReverts() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        amm.addLiquidity(0, 0);
    }

    function test_removeLiquidity_zeroReverts() public {
        vm.expectRevert(abi.encodeWithSelector(KickTypes.ZeroAmount.selector));
        amm.removeLiquidity(0, 0, 0);
    }

    function test_removeLiquidity_insufficientLP() public {
        vm.prank(bob);
        vm.expectRevert();
        amm.removeLiquidity(1, 0, 0); // bob has no LP
    }

    // ══════════════════════════════════════════════════════════════
    // ██  AMM PRICE VIEW
    // ══════════════════════════════════════════════════════════════

    function test_price_view() public view {
        uint256 p = amm.price();
        assertTrue(p > 0, "price should be > 0");

        // Price should be close to the curve price at graduation
        // price = reserveUsdt * 1e18 / reserveToken
        uint256 expected = (amm.reserveUsdt() * 1e18) / amm.reserveToken();
        assertEq(p, expected, "price view should match manual calculation");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  PROTOCOL FEE WITHDRAWAL
    // ══════════════════════════════════════════════════════════════

    function test_withdrawProtocolFees() public {
        // Generate some fees via swap
        uint256 swapAmount = 10_000e18;
        vm.prank(bob);
        usdt.approve(address(amm), swapAmount);
        vm.prank(bob);
        amm.swapUsdtForShares(swapAmount, 0);

        uint256 fees = amm.protocolFeesUsdt();
        assertTrue(fees > 0, "should have protocol fees");

        // Only market can withdraw
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(KickTypes.NotMarket.selector));
        amm.withdrawProtocolFees(alice);

        // Market owner withdraws via market (we are the market here since graduate deployed it)
        // Actually the market address is address(market), so we need to prank as market
        uint256 balBefore = usdt.balanceOf(owner);
        vm.prank(address(market));
        amm.withdrawProtocolFees(owner);

        assertEq(usdt.balanceOf(owner) - balBefore, fees);
        assertEq(amm.protocolFeesUsdt(), 0);
    }

    // ══════════════════════════════════════════════════════════════
    // ██  FUZZ: SWAP ROUNDTRIP LOSES TO FEES
    // ══════════════════════════════════════════════════════════════

    function testFuzz_swapRoundtripLosesToFees(uint8 pctInput) public {
        uint256 pct = bound(pctInput, 1, 30);
        uint256 swapUsdt = (amm.reserveUsdt() * pct) / 100;
        if (swapUsdt == 0) return;

        // Swap USDT → Token
        vm.prank(bob);
        usdt.approve(address(amm), swapUsdt);
        vm.prank(bob);
        uint256 tokenGot = amm.swapUsdtForShares(swapUsdt, 0);

        // Swap Token → USDT
        vm.prank(bob);
        token.approve(address(amm), tokenGot);
        vm.prank(bob);
        uint256 usdtBack = amm.swapSharesForUsdt(tokenGot, 0);

        // Due to fees, should always get back less than input
        assertTrue(usdtBack < swapUsdt, "roundtrip should lose to fees");
    }
}
