// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PerformanceOracle} from "../src/PerformanceOracle.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @title SimulateMatchday
/// @notice Simulates a "Group Stage Day 1" matchday by funding dividend budgets
///         and pushing batched performance stats via the PerformanceOracle.
///         Produces StatPushed / StatBatchPushed events for indexer testing.
contract SimulateMatchday is Script {
    // ── Deployed addresses (xlayer-testnet) ──────────────────────
    address constant ORACLE_ADDR = 0xF1277da9b1F4b7b72A3A16EC8C17a00Ce702C056;
    address constant MARKET_ADDR = 0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f;
    address constant USDT_ADDR   = 0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851;

    // ── Funding: how much USDT to top-up each player's dividend budget ──
    uint256 constant FUND_AMOUNT = 500e18; // 500 mUSDT per player

    PlayerMarket internal _market;
    PerformanceOracle internal _oracle;
    IERC20 internal _usdt;

    function run() external {
        _market = PlayerMarket(MARKET_ADDR);
        _oracle = PerformanceOracle(ORACLE_ADDR);
        _usdt   = IERC20(USDT_ADDR);

        console2.log("=== Matchday Simulation: Group Stage Day 1 ===");
        console2.log("Oracle:", ORACLE_ADDR);
        console2.log("Market:", MARKET_ADDR);
        console2.log("USDT:  ", USDT_ADDR);

        // ────────────────────────────────────────────────────────────
        // Build matchday events
        // ────────────────────────────────────────────────────────────
        //
        // Match 1: Argentina 2-1 France
        //   Messi (1)      — GOAL, MOTM
        //   Lautaro (2)    — GOAL, ASSIST
        //   GK Dibu (3)    — CLEAN_SHEET  (conceded 1, no CS in reality, but for demo)
        //   Mbappe (11)    — GOAL
        //   Neymar (6)     — ASSIST (guest appearance logic, cross-team for demo variety)
        //
        // Match 2: Brazil 3-0 Germany
        //   Neymar (6)     — GOAL, MOTM
        //   Vinicius (7)   — GOAL, ASSIST
        //   Rodrygo (8)    — GOAL
        //   Alisson (9)    — CLEAN_SHEET
        //   Casemiro (10)  — ASSIST
        //
        // Match 3: Spain 1-0 Italy
        //   Pedri (15)     — GOAL, MOTM
        //   Gavi (16)      — ASSIST
        //   Unai Simon (17)— CLEAN_SHEET

        // Total entries: 18 stat lines for 13 unique players
        uint256[] memory playerIds = new uint256[](18);
        KickTypes.StatType[] memory statTypes = new KickTypes.StatType[](18);

        // -- Match 1: Argentina vs France --
        playerIds[0]  = 1;  statTypes[0]  = KickTypes.StatType.GOAL;
        playerIds[1]  = 1;  statTypes[1]  = KickTypes.StatType.MOTM;
        playerIds[2]  = 2;  statTypes[2]  = KickTypes.StatType.GOAL;
        playerIds[3]  = 2;  statTypes[3]  = KickTypes.StatType.ASSIST;
        playerIds[4]  = 3;  statTypes[4]  = KickTypes.StatType.CLEAN_SHEET;
        playerIds[5]  = 11; statTypes[5]  = KickTypes.StatType.GOAL;
        playerIds[6]  = 6;  statTypes[6]  = KickTypes.StatType.ASSIST;

        // -- Match 2: Brazil vs Germany --
        playerIds[7]  = 6;  statTypes[7]  = KickTypes.StatType.GOAL;
        playerIds[8]  = 6;  statTypes[8]  = KickTypes.StatType.MOTM;
        playerIds[9]  = 7;  statTypes[9]  = KickTypes.StatType.GOAL;
        playerIds[10] = 7;  statTypes[10] = KickTypes.StatType.ASSIST;
        playerIds[11] = 8;  statTypes[11] = KickTypes.StatType.GOAL;
        playerIds[12] = 9;  statTypes[12] = KickTypes.StatType.CLEAN_SHEET;
        playerIds[13] = 10; statTypes[13] = KickTypes.StatType.ASSIST;

        // -- Match 3: Spain vs Italy --
        playerIds[14] = 15; statTypes[14] = KickTypes.StatType.GOAL;
        playerIds[15] = 15; statTypes[15] = KickTypes.StatType.MOTM;
        playerIds[16] = 16; statTypes[16] = KickTypes.StatType.ASSIST;
        playerIds[17] = 17; statTypes[17] = KickTypes.StatType.CLEAN_SHEET;

        // ────────────────────────────────────────────────────────────
        // Step 1: Collect unique player IDs that need funding
        // ────────────────────────────────────────────────────────────
        uint256[] memory uniquePlayers = _uniquePlayerIds(playerIds);

        console2.log("\n--- Step 1: Funding dividend budgets ---");
        console2.log("Unique players to fund:", uniquePlayers.length);

        vm.startBroadcast();

        // Approve market to pull USDT for funding
        uint256 totalApproval = FUND_AMOUNT * uniquePlayers.length;
        _usdt.approve(MARKET_ADDR, totalApproval);
        console2.log("Approved USDT for funding:", totalApproval / 1e18, "mUSDT");

        for (uint256 i; i < uniquePlayers.length; ++i) {
            uint256 pid = uniquePlayers[i];
            PlayerMarket.PlayerInfo memory info = _market.getPlayerInfo(pid);

            console2.log("  Player", pid, "current budget:", info.dividendBudget / 1e18);

            // Fund if budget is below the threshold needed for this matchday
            if (info.dividendBudget < FUND_AMOUNT) {
                uint256 topUp = FUND_AMOUNT - info.dividendBudget;
                _market.fundDividends(pid, topUp);
                console2.log("    -> Funded +", topUp / 1e18, "mUSDT");
            } else {
                console2.log("    -> Already funded, skipping");
            }
        }

        // ────────────────────────────────────────────────────────────
        // Step 2: Push batched stats via oracle
        // ────────────────────────────────────────────────────────────
        console2.log("\n--- Step 2: Pushing matchday stats ---");
        console2.log("Total stat entries:", playerIds.length);

        _logMatchEvents(playerIds, statTypes);

        _oracle.pushBatch(playerIds, statTypes);
        console2.log("\npushBatch executed successfully!");

        // ────────────────────────────────────────────────────────────
        // Step 3: Verify post-distribution budgets
        // ────────────────────────────────────────────────────────────
        console2.log("\n--- Step 3: Post-distribution budget check ---");
        for (uint256 i; i < uniquePlayers.length; ++i) {
            uint256 pid = uniquePlayers[i];
            PlayerMarket.PlayerInfo memory info = _market.getPlayerInfo(pid);
            console2.log("  Player", pid, "remaining budget:", info.dividendBudget / 1e18);
        }

        vm.stopBroadcast();

        console2.log("\n=== Group Stage Day 1 Complete ===");
    }

    // ── Helpers ──────────────────────────────────────────────────

    /// @dev Extract unique player IDs from the batch array.
    function _uniquePlayerIds(uint256[] memory ids) internal pure returns (uint256[] memory) {
        uint256[] memory buf = new uint256[](ids.length);
        uint256 count;

        for (uint256 i; i < ids.length; ++i) {
            bool found;
            for (uint256 j; j < count; ++j) {
                if (buf[j] == ids[i]) { found = true; break; }
            }
            if (!found) {
                buf[count] = ids[i];
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 k; k < count; ++k) result[k] = buf[k];
        return result;
    }

    /// @dev Log each stat entry with a human-readable label.
    function _logMatchEvents(uint256[] memory pids, KickTypes.StatType[] memory stats) internal pure {
        for (uint256 i; i < pids.length; ++i) {
            string memory label;
            if (stats[i] == KickTypes.StatType.GOAL)        label = "GOAL";
            else if (stats[i] == KickTypes.StatType.ASSIST)      label = "ASSIST";
            else if (stats[i] == KickTypes.StatType.CLEAN_SHEET) label = "CLEAN_SHEET";
            else if (stats[i] == KickTypes.StatType.MOTM)        label = "MOTM";
            else if (stats[i] == KickTypes.StatType.RED_CARD)    label = "RED_CARD";
            else label = "UNKNOWN";

            console2.log("  Event:", pids[i], label);
        }
    }
}
