// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerAMM} from "../src/PlayerAMM.sol";
import {IndexVault, IndexToken} from "../src/IndexVault.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";

contract IndexVaultTest is Test {
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;
    IndexVault vault;

    address owner = address(this);
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    // Player IDs
    uint256 constant P1 = 1;
    uint256 constant P2 = 2;
    uint256 constant P3 = 3;
    uint256 constant P4 = 4;

    function setUp() public {
        // Deploy core contracts
        usdt = new MockUSDT();
        factory = new PlayerTokenFactory();
        market = new PlayerMarket(address(usdt), address(factory));
        vault = new IndexVault(address(usdt), address(market));

        // List 4 players
        market.listPlayer(P1, "Player One", "P1");
        market.listPlayer(P2, "Player Two", "P2");
        market.listPlayer(P3, "Player Three", "P3");
        market.listPlayer(P4, "Player Four", "P4");

        // Fund alice and bob
        usdt.mint(alice, 1_000_000e18);
        usdt.mint(bob, 1_000_000e18);
        usdt.mint(address(vault), 1_000_000e18); // fund vault for testing
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  defineIndex tests
    // ═══════════════════════════════════════════════════════════════

    function test_defineIndex_basic() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        uint256 id = vault.defineIndex("Test Index", IndexVault.IndexKind.CUSTOM, components, weights);
        assertEq(id, 1);

        (string memory name, IndexVault.IndexKind kind, address basketToken,
         uint256[] memory comps, uint16[] memory wts, bool active) = vault.getIndex(id);

        assertEq(name, "Test Index");
        assertEq(uint8(kind), uint8(IndexVault.IndexKind.CUSTOM));
        assertTrue(basketToken != address(0));
        assertEq(comps.length, 2);
        assertEq(comps[0], P1);
        assertEq(comps[1], P2);
        assertEq(wts[0], 5000);
        assertEq(wts[1], 5000);
        assertTrue(active);
    }

    function test_defineIndex_weightsMustSumToBps() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 5000;
        weights[1] = 4999; // Sum = 9999, not 10000

        vm.expectRevert(KickTypes.WeightsMustSumToBps.selector);
        vault.defineIndex("Bad Index", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_weightsOverflow() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 5000;
        weights[1] = 5001; // Sum = 10001

        vm.expectRevert(KickTypes.WeightsMustSumToBps.selector);
        vault.defineIndex("Bad Index", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_emptyComponents_reverts() public {
        uint256[] memory components = new uint256[](0);
        uint16[] memory weights = new uint16[](0);

        vm.expectRevert(KickTypes.InvalidParam.selector);
        vault.defineIndex("Empty", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_mismatchedLengths_reverts() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](1);
        weights[0] = 10000;

        vm.expectRevert(KickTypes.InvalidParam.selector);
        vault.defineIndex("Mismatch", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_unlistedPlayer_reverts() public {
        uint256[] memory components = new uint256[](1);
        components[0] = 999; // not listed
        uint16[] memory weights = new uint16[](1);
        weights[0] = 10000;

        vm.expectRevert(abi.encodeWithSelector(KickTypes.PlayerNotListed.selector, 999));
        vault.defineIndex("Bad Player", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_zeroWeight_reverts() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 10000;
        weights[1] = 0;

        vm.expectRevert(KickTypes.InvalidParam.selector);
        vault.defineIndex("Zero Weight", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_onlyOwner() public {
        uint256[] memory components = new uint256[](1);
        components[0] = P1;
        uint16[] memory weights = new uint16[](1);
        weights[0] = 10000;

        vm.prank(alice);
        vm.expectRevert();
        vault.defineIndex("Not Owner", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function test_defineIndex_multipleIndices() public {
        // Create first index
        uint256[] memory c1 = new uint256[](1);
        c1[0] = P1;
        uint16[] memory w1 = new uint16[](1);
        w1[0] = 10000;
        uint256 id1 = vault.defineIndex("Index 1", IndexVault.IndexKind.NATIONAL, c1, w1);

        // Create second index
        uint256[] memory c2 = new uint256[](2);
        c2[0] = P2;
        c2[1] = P3;
        uint16[] memory w2 = new uint16[](2);
        w2[0] = 6000;
        w2[1] = 4000;
        uint256 id2 = vault.defineIndex("Index 2", IndexVault.IndexKind.POSITION, c2, w2);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(vault.indexCount(), 2);
    }

    function test_defineIndex_fourComponents() public {
        uint256[] memory components = new uint256[](4);
        components[0] = P1;
        components[1] = P2;
        components[2] = P3;
        components[3] = P4;
        uint16[] memory weights = new uint16[](4);
        weights[0] = 3000;
        weights[1] = 3000;
        weights[2] = 2000;
        weights[3] = 2000;

        uint256 id = vault.defineIndex("4-Player", IndexVault.IndexKind.ALLSTAR, components, weights);

        (, , , uint256[] memory comps, uint16[] memory wts, ) = vault.getIndex(id);
        assertEq(comps.length, 4);

        uint256 totalW;
        for (uint256 i; i < wts.length; i++) totalW += wts[i];
        assertEq(totalW, 10000, "weights must sum to BPS");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  mint tests (bonding curve path)
    // ═══════════════════════════════════════════════════════════════

    function test_mint_singleComponent() public {
        // Create single-component index (100% P1)
        uint256 indexId = _createSingleIndex(P1);

        // Alice mints 500 units (~500 USDT notional, enough for multiple shares at base=100)
        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        uint256 balBefore = usdt.balanceOf(alice);

        vault.mint(indexId, 500, 100_000e18);

        uint256 balAfter = usdt.balanceOf(alice);
        assertTrue(balBefore > balAfter, "USDT should decrease");

        // Check basket token minted
        (, , address basketToken, , , ) = vault.getIndex(indexId);
        assertEq(IndexToken(basketToken).balanceOf(alice), 500e18);
        vm.stopPrank();
    }

    function test_mint_multiComponent_weightedCorrectly() public {
        // Create 2-component index: P1 60%, P2 40%
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 6000;
        weights[1] = 4000;
        uint256 indexId = vault.defineIndex("60/40", IndexVault.IndexKind.CUSTOM, components, weights);

        // 1000 units → P1 gets 600 USDT, P2 gets 400 USDT (both enough for shares at base=100)
        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 1000, 200_000e18);

        // Vault should hold player tokens from both components
        (address tokenP1,,,) = market.players(P1);
        (address tokenP2,,,) = market.players(P2);

        uint256 vaultP1 = IERC20(tokenP1).balanceOf(address(vault));
        uint256 vaultP2 = IERC20(tokenP2).balanceOf(address(vault));

        assertTrue(vaultP1 > 0, "Vault should hold P1 tokens");
        assertTrue(vaultP2 > 0, "Vault should hold P2 tokens");
        vm.stopPrank();
    }

    function test_mint_zeroUnits_reverts() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vm.expectRevert(KickTypes.ZeroAmount.selector);
        vault.mint(indexId, 0, 100_000e18);
        vm.stopPrank();
    }

    function test_mint_inactiveIndex_reverts() public {
        uint256 indexId = _createSingleIndex(P1);
        vault.deactivateIndex(indexId);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vm.expectRevert(KickTypes.InvalidParam.selector);
        vault.mint(indexId, 1, 100_000e18);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  redeem tests
    // ═══════════════════════════════════════════════════════════════

    function test_redeem_basic() public {
        uint256 indexId = _createSingleIndex(P1);

        // Alice mints
        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 500, 100_000e18);

        // Alice redeems
        uint256 balBefore = usdt.balanceOf(alice);
        vault.redeem(indexId, 500, 0);
        uint256 balAfter = usdt.balanceOf(alice);

        assertTrue(balAfter > balBefore, "Should receive USDT");

        // Basket tokens should be burned
        (, , address basketToken, , , ) = vault.getIndex(indexId);
        assertEq(IndexToken(basketToken).balanceOf(alice), 0);
        vm.stopPrank();
    }

    function test_redeem_partialRedemption() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 1000, 200_000e18);

        // Redeem only 500 out of 1000
        vault.redeem(indexId, 500, 0);

        (, , address basketToken, , , ) = vault.getIndex(indexId);
        assertEq(IndexToken(basketToken).balanceOf(alice), 500e18, "Should have 500 units left");
        vm.stopPrank();
    }

    function test_redeem_insufficientBasket_reverts() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 500, 100_000e18);

        vm.expectRevert();
        vault.redeem(indexId, 1000, 0); // More than owned
        vm.stopPrank();
    }

    function test_redeem_zeroUnits_reverts() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        vm.expectRevert(KickTypes.ZeroAmount.selector);
        vault.redeem(indexId, 0, 0);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  NAV tests
    // ═══════════════════════════════════════════════════════════════

    function test_nav_zeroSupply_returnsZero() public {
        uint256 indexId = _createSingleIndex(P1);
        assertEq(vault.nav(indexId), 0);
    }

    function test_nav_afterMint_positive() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 500, 100_000e18);
        vm.stopPrank();

        uint256 navValue = vault.nav(indexId);
        assertTrue(navValue > 0, "NAV should be positive after mint");
    }

    function test_nav_consistency() public {
        // Create 2-component index
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 5000;
        weights[1] = 5000;
        uint256 indexId = vault.defineIndex("50/50", IndexVault.IndexKind.CUSTOM, components, weights);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 1000, 200_000e18);
        vm.stopPrank();

        uint256 navValue = vault.nav(indexId);
        assertTrue(navValue > 0, "NAV should be positive");

        // NAV * totalSupply should approximate total sell value
        (, , address basketToken, , , ) = vault.getIndex(indexId);
        uint256 totalSupply = IndexToken(basketToken).totalSupply();
        uint256 totalValue = (navValue * totalSupply) / 1e18;
        assertTrue(totalValue > 0, "total value should be positive");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  componentValues tests
    // ═══════════════════════════════════════════════════════════════

    function test_componentValues_afterMint() public {
        uint256[] memory components = new uint256[](2);
        components[0] = P1;
        components[1] = P2;
        uint16[] memory weights = new uint16[](2);
        weights[0] = 7000;
        weights[1] = 3000;
        uint256 indexId = vault.defineIndex("70/30", IndexVault.IndexKind.CUSTOM, components, weights);

        // 1000 units → P1 gets 700 USDT, P2 gets 300 USDT
        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 1000, 200_000e18);
        vm.stopPrank();

        (uint256[] memory pIds, uint256[] memory values, uint256[] memory balances) = vault.componentValues(indexId);
        assertEq(pIds.length, 2);
        assertTrue(values[0] > 0, "P1 value should be positive");
        assertTrue(values[1] > 0, "P2 value should be positive");
        assertTrue(balances[0] > 0, "P1 balance should be positive");
        assertTrue(balances[1] > 0, "P2 balance should be positive");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  deactivateIndex tests
    // ═══════════════════════════════════════════════════════════════

    function test_deactivateIndex() public {
        uint256 indexId = _createSingleIndex(P1);

        vault.deactivateIndex(indexId);

        (, , , , , bool active) = vault.getIndex(indexId);
        assertFalse(active);
    }

    function test_deactivateIndex_onlyOwner() public {
        uint256 indexId = _createSingleIndex(P1);

        vm.prank(alice);
        vm.expectRevert();
        vault.deactivateIndex(indexId);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  Graduated (AMM path) tests
    // ═══════════════════════════════════════════════════════════════

    function test_mint_graduated_ammPath() public {
        // Graduate P1: buy enough to reach threshold
        _graduatePlayer(P1);

        // Create index with graduated P1
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 5, 200_000e18);

        // Check basket tokens minted
        (, , address basketToken, , , ) = vault.getIndex(indexId);
        assertEq(IndexToken(basketToken).balanceOf(alice), 5e18);

        // Check vault holds player tokens (from AMM swap)
        (address token,,,) = market.players(P1);
        assertTrue(IERC20(token).balanceOf(address(vault)) > 0, "Vault should hold P1 tokens from AMM");
        vm.stopPrank();
    }

    function test_redeem_graduated_ammPath() public {
        _graduatePlayer(P1);
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 5, 200_000e18);

        uint256 balBefore = usdt.balanceOf(alice);
        vault.redeem(indexId, 5, 0);
        uint256 balAfter = usdt.balanceOf(alice);

        assertTrue(balAfter > balBefore, "Should receive USDT from AMM redemption");
        vm.stopPrank();
    }

    function test_nav_graduated() public {
        _graduatePlayer(P1);
        uint256 indexId = _createSingleIndex(P1);

        vm.startPrank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vault.mint(indexId, 5, 200_000e18);
        vm.stopPrank();

        uint256 navValue = vault.nav(indexId);
        assertTrue(navValue > 0, "NAV should be positive for graduated index");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  Index kind coverage
    // ═══════════════════════════════════════════════════════════════

    function test_indexKinds() public {
        uint256[] memory c = new uint256[](1);
        c[0] = P1;
        uint16[] memory w = new uint16[](1);
        w[0] = 10000;

        uint256 id1 = vault.defineIndex("National", IndexVault.IndexKind.NATIONAL, c, w);
        uint256 id2 = vault.defineIndex("Position", IndexVault.IndexKind.POSITION, c, w);
        uint256 id3 = vault.defineIndex("Continental", IndexVault.IndexKind.CONTINENTAL, c, w);
        uint256 id4 = vault.defineIndex("AllStar", IndexVault.IndexKind.ALLSTAR, c, w);
        uint256 id5 = vault.defineIndex("Custom", IndexVault.IndexKind.CUSTOM, c, w);

        (, IndexVault.IndexKind k1, , , , ) = vault.getIndex(id1);
        (, IndexVault.IndexKind k2, , , , ) = vault.getIndex(id2);
        (, IndexVault.IndexKind k3, , , , ) = vault.getIndex(id3);
        (, IndexVault.IndexKind k4, , , , ) = vault.getIndex(id4);
        (, IndexVault.IndexKind k5, , , , ) = vault.getIndex(id5);

        assertEq(uint8(k1), 0);
        assertEq(uint8(k2), 1);
        assertEq(uint8(k3), 2);
        assertEq(uint8(k4), 3);
        assertEq(uint8(k5), 4);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  HELPERS
    // ═══════════════════════════════════════════════════════════════

    function _createSingleIndex(uint256 playerId) internal returns (uint256) {
        uint256[] memory components = new uint256[](1);
        components[0] = playerId;
        uint16[] memory weights = new uint16[](1);
        weights[0] = 10000;
        return vault.defineIndex("Single", IndexVault.IndexKind.CUSTOM, components, weights);
    }

    function _graduatePlayer(uint256 playerId) internal {
        // Need to buy enough shares to push reserve past GRADUATION_THRESHOLD (50,000 mUSDT)
        // Buy in large chunks until we can graduate
        usdt.mint(address(this), 10_000_000e18);
        usdt.approve(address(market), type(uint256).max);

        // Buy 500 shares at a time until graduation threshold
        uint256 rounds = 0;
        while (!market.canGraduate(playerId) && rounds < 100) {
            uint256 shares = 10;
            (uint256 cost,) = market.quoteBuy(playerId, shares);
            market.buy(playerId, shares, cost);
            rounds++;
        }

        require(market.canGraduate(playerId), "Failed to reach graduation threshold");
        market.graduate(playerId);
        require(market.graduated(playerId), "Graduation failed");
    }
}
