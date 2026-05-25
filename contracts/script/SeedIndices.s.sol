// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {IndexVault, IndexToken} from "../src/IndexVault.sol";

/// @title SeedIndices
/// @notice M10 deployment script: deploys IndexVault, defines sample indices,
///         demonstrates ETF mint/redeem and NAV calculation.
contract SeedIndices is Script {
    // ── Addresses from deployments/xlayer-testnet.json ──
    address constant USDT_ADDR   = 0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851;
    address constant MARKET_ADDR = 0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f;

    function run() external {
        uint256 deployerKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MockUSDT usdt = MockUSDT(USDT_ADDR);
        PlayerMarket market = PlayerMarket(MARKET_ADDR);

        // ═══════════════════════════════════════════════════════════════
        // Step 1: Deploy IndexVault
        // ═══════════════════════════════════════════════════════════════
        IndexVault vault = new IndexVault(address(usdt), address(market));
        console2.log("IndexVault deployed:", address(vault));

        // ═══════════════════════════════════════════════════════════════
        // Step 2: Define Argentina National Squad Index
        // ═══════════════════════════════════════════════════════════════
        {
            uint256[] memory argComponents = new uint256[](5);
            argComponents[0] = 1;   // Messi
            argComponents[1] = 2;   // Alvarez
            argComponents[2] = 3;   // Enzo
            argComponents[3] = 4;   // E. Martinez
            argComponents[4] = 151; // Lautaro

            uint16[] memory argWeights = new uint16[](5);
            argWeights[0] = 3000;  // 30% Messi
            argWeights[1] = 2000;  // 20% Alvarez
            argWeights[2] = 2000;  // 20% Enzo
            argWeights[3] = 1500;  // 15% E. Martinez
            argWeights[4] = 1500;  // 15% Lautaro

            uint256 argId = vault.defineIndex(
                "Argentina National Squad",
                IndexVault.IndexKind.NATIONAL,
                argComponents,
                argWeights
            );
            console2.log("Index #%d: Argentina National Squad", argId);
        }

        // ═══════════════════════════════════════════════════════════════
        // Step 3: Define FW Position Index (top 5 forwards)
        // ═══════════════════════════════════════════════════════════════
        {
            uint256[] memory fwComponents = new uint256[](5);
            fwComponents[0] = 1;   // Messi
            fwComponents[1] = 6;   // Vinicius
            fwComponents[2] = 11;  // Mbappe
            fwComponents[3] = 142; // Haaland
            fwComponents[4] = 17;  // Kane

            uint16[] memory fwWeights = new uint16[](5);
            fwWeights[0] = 2000;
            fwWeights[1] = 2000;
            fwWeights[2] = 2000;
            fwWeights[3] = 2000;
            fwWeights[4] = 2000;

            uint256 fwId = vault.defineIndex(
                "FW Position Index",
                IndexVault.IndexKind.POSITION,
                fwComponents,
                fwWeights
            );
            console2.log("Index #%d: FW Position Index", fwId);
        }

        // ═══════════════════════════════════════════════════════════════
        // Step 4: Define World Cup All-Stars (top 10)
        // ═══════════════════════════════════════════════════════════════
        {
            uint256[] memory allStarComponents = new uint256[](10);
            allStarComponents[0] = 1;   // Messi
            allStarComponents[1] = 6;   // Vinicius
            allStarComponents[2] = 11;  // Mbappe
            allStarComponents[3] = 16;  // Bellingham
            allStarComponents[4] = 21;  // Yamal
            allStarComponents[5] = 34;  // Ronaldo
            allStarComponents[6] = 142; // Haaland
            allStarComponents[7] = 80;  // Salah
            allStarComponents[8] = 57;  // Son
            allStarComponents[9] = 38;  // De Bruyne

            uint16[] memory allStarWeights = new uint16[](10);
            for (uint256 i; i < 10; ++i) allStarWeights[i] = 1000; // Equal 10% each

            uint256 asId = vault.defineIndex(
                "World Cup 500 All-Stars",
                IndexVault.IndexKind.ALLSTAR,
                allStarComponents,
                allStarWeights
            );
            console2.log("Index #%d: World Cup 500 All-Stars", asId);
        }

        // ═══════════════════════════════════════════════════════════════
        // Step 5: Demo — Mint Argentina Index (1000 units ≈ 1000 USDT)
        // ═══════════════════════════════════════════════════════════════
        {
            // Mint mUSDT for demo
            usdt.mint(msg.sender, 50_000e18);
            usdt.approve(address(vault), type(uint256).max);

            console2.log("\n--- ETF Mint Demo ---");
            uint256 balBefore = usdt.balanceOf(msg.sender);

            vault.mint(1, 1000, 10_000e18); // Mint 1000 units of Argentina index

            uint256 balAfter = usdt.balanceOf(msg.sender);
            uint256 spent = balBefore - balAfter;
            console2.log("Minted 1000 units of Argentina Index");
            console2.log("USDT spent:", spent / 1e18);

            // Check NAV
            uint256 navVal = vault.nav(1);
            console2.log("NAV per unit:", navVal / 1e15, "mUSDT (x1000)");

            // Show basket token balance
            (,, address basketToken,,,) = vault.getIndex(1);
            uint256 basketBal = IERC20(basketToken).balanceOf(msg.sender);
            console2.log("Basket token balance:", basketBal / 1e18);
        }

        // ═══════════════════════════════════════════════════════════════
        // Step 6: Demo — Redeem half of Argentina Index
        // ═══════════════════════════════════════════════════════════════
        {
            console2.log("\n--- ETF Redeem Demo ---");
            uint256 balBefore = usdt.balanceOf(msg.sender);

            vault.redeem(1, 500, 0); // Redeem 500 units

            uint256 balAfter = usdt.balanceOf(msg.sender);
            uint256 received = balAfter - balBefore;
            console2.log("Redeemed 500 units of Argentina Index");
            console2.log("USDT received:", received / 1e18);

            // Post-redeem NAV
            uint256 navVal = vault.nav(1);
            console2.log("NAV per unit after redeem:", navVal / 1e15, "mUSDT (x1000)");
        }

        console2.log("\n=== M10 SeedIndices complete ===");
        console2.log("IndexVault:", address(vault));
        console2.log("Total indices defined:", vault.indexCount());

        vm.stopBroadcast();
    }
}
