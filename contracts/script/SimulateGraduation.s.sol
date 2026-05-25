// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerAMM} from "../src/PlayerAMM.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {BondingCurve} from "../src/libraries/BondingCurve.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @title SimulateGraduation
/// @notice Simulates the graduation flow for multiple star players:
///         1. Concentrated buys push reserve above GRADUATION_THRESHOLD (50,000 mUSDT)
///         2. Trigger graduation → AMM seeded with reserve + minted tokens
///         3. Post-graduation: AMM swaps and LP operations
contract SimulateGraduation is Script {
    // ── Live deployment addresses (X Layer Testnet) ─────────────
    address constant USDT_ADDR   = 0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851;
    address constant MARKET_ADDR = 0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f;

    // ── Star player IDs to graduate ─────────────────────────────
    uint256[] internal starIds;

    function setUp() public {
        // Top superstars with likely highest trading interest
        starIds.push(1);   // Messi
        starIds.push(2);   // Lautaro
        starIds.push(11);  // Neymar
        starIds.push(12);  // Vinicius
        starIds.push(21);  // Mbappe
    }

    function run() external {
        uint256 deployerKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        MockUSDT usdt = MockUSDT(USDT_ADDR);
        PlayerMarket market = PlayerMarket(MARKET_ADDR);

        console2.log("=== SimulateGraduation ===");
        console2.log("Deployer:", deployer);
        console2.log("GRADUATION_THRESHOLD:", KickTypes.GRADUATION_THRESHOLD / 1e18, "mUSDT");

        vm.startBroadcast(deployerKey);

        // Mint enough USDT for all operations
        uint256 totalNeeded = 500_000e18; // generous buffer
        usdt.mint(deployer, totalNeeded);
        usdt.approve(address(market), type(uint256).max);

        for (uint256 i = 0; i < starIds.length; i++) {
            uint256 pid = starIds[i];
            _graduatePlayer(market, usdt, pid, deployer);
        }

        vm.stopBroadcast();

        console2.log("\n=== All graduations complete ===");
    }

    function _graduatePlayer(
        PlayerMarket market,
        MockUSDT usdt,
        uint256 playerId,
        address /* trader */
    ) internal {
        (address tokenAddr,, uint256 reserve,) = market.players(playerId);
        if (tokenAddr == address(0)) {
            console2.log("  Player", playerId, "not listed, skipping");
            return;
        }

        if (market.graduated(playerId)) {
            console2.log("  Player", playerId, "already graduated, skipping");
            return;
        }

        console2.log("\n--- Player", playerId, "---");
        console2.log("  Current reserve:", reserve / 1e18, "mUSDT");

        // Phase 1: Buy shares until reserve >= GRADUATION_THRESHOLD
        uint256 batchSize = 10;
        while (reserve < KickTypes.GRADUATION_THRESHOLD) {
            (uint256 cost,) = market.quoteBuy(playerId, batchSize);
            market.buy(playerId, batchSize, cost);
            (,, reserve,) = market.players(playerId);
        }

        console2.log("  Reserve after buys:", reserve / 1e18, "mUSDT");
        uint256 curPrice = market.currentPrice(playerId);
        console2.log("  Curve price:", curPrice / 1e18, "mUSDT");

        // Phase 2: Graduate
        market.graduate(playerId);
        address ammAddr = market.playerAmm(playerId);
        console2.log("  Graduated! AMM:", ammAddr);

        // Phase 3: Post-graduation AMM swaps
        PlayerAMM amm = PlayerAMM(ammAddr);
        PlayerToken token = PlayerToken(tokenAddr);

        console2.log("  AMM reserves: USDT=", amm.reserveUsdt() / 1e18, "Token=", amm.reserveToken() / 1e18);

        // Swap USDT → Token
        uint256 swapIn = 500e18;
        usdt.approve(ammAddr, swapIn);
        uint256 tokenOut = amm.swapUsdtForShares(swapIn, 0);
        console2.log("  Swap 500 mUSDT -> tokens:", tokenOut / 1e18);

        // Swap Token → USDT
        uint256 tokenSwap = tokenOut / 2;
        token.approve(ammAddr, tokenSwap);
        uint256 usdtOut = amm.swapSharesForUsdt(tokenSwap, 0);
        console2.log("  Swap tokens -> mUSDT:", usdtOut / 1e18);

        // Add LP
        uint256 lpUsdt = 1_000e18;
        uint256 lpToken = (lpUsdt * amm.reserveToken()) / amm.reserveUsdt();
        usdt.approve(ammAddr, lpUsdt);
        token.approve(ammAddr, lpToken + 1e18);
        uint256 lpMinted = amm.addLiquidity(lpUsdt, 0);
        console2.log("  Added LP: minted", lpMinted / 1e18, "LP tokens");

        console2.log("  AMM price after operations:", amm.price() / 1e18, "mUSDT");
    }
}
