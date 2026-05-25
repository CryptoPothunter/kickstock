// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PerformanceOracle} from "../src/PerformanceOracle.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @title KickStockForkTest
/// @notice Fork test against X Layer Testnet (chainId 195).
///         Validates that deployed contracts have bytecode, wiring is correct,
///         and the full flow (faucet → approve → buy → sell → claim) works.
///         Also verifies the reserve invariant holds on live state.
///
/// @dev Run with:
///      forge test --match-contract KickStockForkTest --fork-url $XLAYER_TESTNET_RPC -vvv
contract KickStockForkTest is Test {
    // ── Deployed addresses (loaded from env) ─────────────────────
    MockUSDT usdt;
    PlayerTokenFactory factory;
    PlayerMarket market;
    PerformanceOracle oracle;

    // ── Test user ────────────────────────────────────────────────
    address user = makeAddr("forkTestUser");

    function setUp() public {
        // Load deployed addresses from environment
        address usdtAddr = vm.envAddress("MOCK_USDT");
        address factoryAddr = vm.envAddress("PLAYER_TOKEN_FACTORY");
        address marketAddr = vm.envAddress("PLAYER_MARKET");
        address oracleAddr = vm.envAddress("PERFORMANCE_ORACLE");

        usdt = MockUSDT(usdtAddr);
        factory = PlayerTokenFactory(factoryAddr);
        market = PlayerMarket(marketAddr);
        oracle = PerformanceOracle(oracleAddr);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  1. BYTECODE VERIFICATION
    // ═══════════════════════════════════════════════════════════════

    function test_contractsHaveBytecode() public view {
        assertTrue(address(usdt).code.length > 0, "MockUSDT has no bytecode");
        assertTrue(address(factory).code.length > 0, "Factory has no bytecode");
        assertTrue(address(market).code.length > 0, "PlayerMarket has no bytecode");
        assertTrue(address(oracle).code.length > 0, "Oracle has no bytecode");

        // Factory implementation should also have bytecode
        address impl = factory.implementation();
        assertTrue(impl.code.length > 0, "PlayerToken implementation has no bytecode");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  2. WIRING VERIFICATION
    // ═══════════════════════════════════════════════════════════════

    function test_wiringCorrect() public view {
        // Market uses correct USDT and factory
        assertEq(address(market.usdt()), address(usdt), "Market USDT mismatch");
        assertEq(address(market.factory()), address(factory), "Market factory mismatch");

        // Market's oracle is set to the PerformanceOracle
        assertEq(market.oracle(), address(oracle), "Market oracle mismatch");

        // Oracle's market is set to the PlayerMarket
        assertEq(address(oracle.market()), address(market), "Oracle market mismatch");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  3. PLAYERS LISTED
    // ═══════════════════════════════════════════════════════════════

    function test_playersAreListed() public view {
        uint256 count = market.listedCount();
        console2.log("Listed players:", count);
        assertTrue(count >= 100, "Expected at least 100 listed players");

        // Spot-check a few known players
        // Player 1 = Messi
        PlayerMarket.PlayerInfo memory info1 = market.getPlayerInfo(1);
        assertTrue(info1.token != address(0), "Player 1 (Messi) not listed");

        // Player 11 = Mbappe
        PlayerMarket.PlayerInfo memory info11 = market.getPlayerInfo(11);
        assertTrue(info11.token != address(0), "Player 11 (Mbappe) not listed");

        // Player 142 = Haaland
        PlayerMarket.PlayerInfo memory info142 = market.getPlayerInfo(142);
        assertTrue(info142.token != address(0), "Player 142 (Haaland) not listed");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  4. FULL FLOW: faucet → approve → buy → sell → claim
    // ═══════════════════════════════════════════════════════════════

    function test_fullFlow_faucetApproveBuySellClaim() public {
        uint256 playerId = 1; // Messi

        // 1. Faucet: get 1000 mUSDT
        vm.startPrank(user);
        usdt.faucet();
        uint256 balance = usdt.balanceOf(user);
        assertGe(balance, 1000e18, "Faucet should give at least 1000 mUSDT");
        console2.log("After faucet, balance:", balance / 1e18, "mUSDT");

        // 2. Approve market
        usdt.approve(address(market), type(uint256).max);

        // 3. Buy 2 shares of Messi
        (uint256 totalCost,) = market.quoteBuy(playerId, 2);
        console2.log("Quote buy 2 shares:", totalCost / 1e18, "mUSDT");

        uint256 balanceBefore = usdt.balanceOf(user);
        market.buy(playerId, 2, totalCost);
        uint256 balanceAfter = usdt.balanceOf(user);
        assertEq(balanceBefore - balanceAfter, totalCost, "USDT deducted should match quote");

        // Check player token balance
        PlayerMarket.PlayerInfo memory info = market.getPlayerInfo(playerId);
        PlayerToken token = PlayerToken(info.token);
        uint256 tokenBal = token.balanceOf(user);
        assertEq(tokenBal, 2e18, "Should hold 2 player tokens");
        console2.log("Player token balance:", tokenBal / 1e18);

        // 4. Sell 1 share
        (uint256 netProceeds,) = market.quoteSell(playerId, 1);
        console2.log("Quote sell 1 share:", netProceeds / 1e18, "mUSDT");

        balanceBefore = usdt.balanceOf(user);
        market.sell(playerId, 1, netProceeds);
        balanceAfter = usdt.balanceOf(user);
        assertEq(balanceAfter - balanceBefore, netProceeds, "USDT received should match quote");

        // Token balance should be 1 now
        tokenBal = token.balanceOf(user);
        assertEq(tokenBal, 1e18, "Should hold 1 player token after sell");

        // 5. Claim dividends (might be 0 if no dividends distributed for this player)
        uint256 pending = token.pending(user);
        console2.log("Pending dividends:", pending / 1e18, "mUSDT");
        if (pending > 0) {
            token.claim();
            uint256 claimedBalance = usdt.balanceOf(user);
            assertTrue(claimedBalance > balanceAfter, "Should have received dividends");
        }

        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  5. RESERVE INVARIANT ON LIVE STATE
    // ═══════════════════════════════════════════════════════════════

    function test_reserveInvariant_liveState() public view {
        uint256 count = market.listedCount();
        uint256 curveBase = market.curveBase();
        uint256 curveSlope = market.curveSlope();
        uint256 violations;

        for (uint256 i = 0; i < count; i++) {
            uint256 pid = market.listedPlayerIds(i);
            PlayerMarket.PlayerInfo memory info = market.getPlayerInfo(pid);

            if (info.supply == 0) {
                // No supply → reserve should be 0
                assertEq(info.reserve, 0, "Zero supply should have zero reserve");
                continue;
            }

            // Theoretical reserve from bonding curve formula
            uint256 theoretical = BondingCurve.reserveOf(info.supply, curveBase, curveSlope);

            if (info.reserve != theoretical) {
                console2.log("VIOLATION player", pid, "reserve:", info.reserve);
                console2.log("  theoretical:", theoretical);
                violations++;
            }
        }

        assertEq(violations, 0, "Reserve invariant violated on live state");
        console2.log("Reserve invariant verified for", count, "players");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  6. MONETARY CONSERVATION
    // ═══════════════════════════════════════════════════════════════

    function test_monetaryConservation_liveState() public view {
        uint256 count = market.listedCount();
        uint256 totalReserve;
        uint256 totalDivBudget;

        for (uint256 i = 0; i < count; i++) {
            uint256 pid = market.listedPlayerIds(i);
            PlayerMarket.PlayerInfo memory info = market.getPlayerInfo(pid);
            totalReserve += info.reserve;
            totalDivBudget += info.dividendBudget;
        }

        uint256 protocolFees = market.protocolFees();
        uint256 expectedMin = totalReserve + totalDivBudget + protocolFees;
        uint256 actualBalance = usdt.balanceOf(address(market));

        console2.log("Market USDT balance:", actualBalance / 1e18);
        console2.log("Sum(reserve):", totalReserve / 1e18);
        console2.log("Sum(divBudget):", totalDivBudget / 1e18);
        console2.log("protocolFees:", protocolFees / 1e18);
        console2.log("Expected min:", expectedMin / 1e18);

        // Market balance should be >= sum of reserves + divBudgets + protocolFees
        // (could be slightly more due to rounding in fee splits)
        assertGe(actualBalance, expectedMin, "Market balance below theoretical minimum");
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  7. PLAYER TOKEN CLONE VERIFICATION
    // ═══════════════════════════════════════════════════════════════

    function test_playerTokenClones_areFunctional() public view {
        // Verify a few player token clones have correct metadata
        PlayerMarket.PlayerInfo memory info1 = market.getPlayerInfo(1);
        if (info1.token != address(0)) {
            PlayerToken t1 = PlayerToken(info1.token);
            assertEq(t1.decimals(), 18, "Player token should have 18 decimals");
            assertTrue(bytes(t1.name()).length > 0, "Player token should have a name");
            assertTrue(bytes(t1.symbol()).length > 0, "Player token should have a symbol");
            console2.log("Player 1 token:", info1.token);
            console2.log("  name:", t1.name());
            console2.log("  symbol:", t1.symbol());
            console2.log("  totalSupply:", t1.totalSupply() / 1e18);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  8. ORACLE DISTRIBUTE FLOW (requires owner)
    // ═══════════════════════════════════════════════════════════════

    function test_oracleDistribute_endToEnd() public {
        uint256 playerId = 1; // Messi

        PlayerMarket.PlayerInfo memory info = market.getPlayerInfo(playerId);
        if (info.supply == 0 || info.dividendBudget == 0) {
            console2.log("Skipping oracle test: player has no supply or dividend budget");
            return;
        }

        // Get oracle owner
        address oracleOwner = oracle.owner();
        uint256 budgetBefore = info.dividendBudget;
        uint256 goalReward = oracle.statReward(KickTypes.StatType.GOAL);

        if (budgetBefore < goalReward) {
            console2.log("Skipping: dividend budget too low for goal reward");
            return;
        }

        // Push a GOAL stat via oracle owner
        vm.prank(oracleOwner);
        oracle.pushStat(playerId, KickTypes.StatType.GOAL);

        // Verify budget decreased
        PlayerMarket.PlayerInfo memory infoAfter = market.getPlayerInfo(playerId);
        assertEq(infoAfter.dividendBudget, budgetBefore - goalReward, "Budget should decrease by goal reward");
        console2.log("Oracle distribute passed. Budget decreased by:", goalReward / 1e18, "mUSDT");
    }
}
