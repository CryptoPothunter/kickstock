// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";

/// @title SimulateTrading
/// @notice Burner wallets execute weighted-random buy/sell trades against the PlayerMarket.
///         Star players (lower IDs = higher weight) get more trading activity.
///         Produces hundreds to thousands of Bought/Sold events for indexer testing.
contract SimulateTrading is Script {
    uint256 constant NUM_BURNERS = 20;
    uint256 constant ROUNDS_PER_BURNER = 15;
    uint256 constant MAX_HOLDINGS = 200;

    uint256 constant TIER1_END = 30;
    uint256 constant TIER2_END = 80;
    uint256 constant TOTAL_WEIGHT = 310; // 30*3 + 50*2 + 120*1

    PlayerMarket internal _market;
    IERC20 internal _usdt;
    uint256 internal _totalBuys;
    uint256 internal _totalSells;

    function run() external {
        address marketAddr = vm.envAddress("PLAYER_MARKET");
        address usdtAddr = vm.envAddress("MOCK_USDT");

        _market = PlayerMarket(marketAddr);
        _usdt = IERC20(usdtAddr);

        console2.log("PlayerMarket:", marketAddr);
        console2.log("MockUSDT:", usdtAddr);
        console2.log("Simulating", NUM_BURNERS * ROUNDS_PER_BURNER, "trade rounds");

        for (uint256 b = 0; b < NUM_BURNERS; b++) {
            _runBurner(b);
            console2.log("Burner", b, "done");
        }

        console2.log("\n=== Trading Simulation Complete ===");
        console2.log("Total buys:", _totalBuys);
        console2.log("Total sells:", _totalSells);
        console2.log("Total trades:", _totalBuys + _totalSells);
    }

    function _runBurner(uint256 b) internal {
        uint256 burnerKey = uint256(keccak256(abi.encodePacked("kickstock-burner", b)));
        address burner = vm.addr(burnerKey);

        vm.startBroadcast(burnerKey);
        _usdt.approve(address(_market), type(uint256).max);

        uint256[] memory holdings = new uint256[](MAX_HOLDINGS);
        uint256 holdingCount;

        for (uint256 r = 0; r < ROUNDS_PER_BURNER; r++) {
            uint256 seed = uint256(keccak256(abi.encodePacked(b, r, block.number, block.prevrandao)));
            uint256 playerId = _weightedRandomPlayer(seed);
            uint256 sharesToBuy = (seed % 3) + 1;

            holdingCount = _tryBuy(burner, playerId, sharesToBuy, holdings, holdingCount);

            if (holdingCount > 0 && (seed >> 8) % 5 < 2) {
                uint256 sellPid = holdings[(seed >> 16) % holdingCount];
                _trySell(sellPid, burner);
            }
        }

        vm.stopBroadcast();
    }

    function _tryBuy(
        address burner,
        uint256 playerId,
        uint256 shares,
        uint256[] memory holdings,
        uint256 holdingCount
    ) internal returns (uint256 newHoldingCount) {
        newHoldingCount = holdingCount;

        // Pre-check: is the player listed?
        PlayerMarket.PlayerInfo memory info = _market.getPlayerInfo(playerId);
        if (info.token == address(0)) return newHoldingCount;

        (uint256 totalCost,) = _market.quoteBuy(playerId, shares);
        if (_usdt.balanceOf(burner) < totalCost) return newHoldingCount;

        uint256 maxTotal = totalCost + (totalCost / 20);
        _market.buy(playerId, shares, maxTotal);
        _totalBuys++;
        newHoldingCount = _trackHolding(holdings, holdingCount, playerId);
    }

    function _trySell(uint256 playerId, address burner) internal {
        // Check that the burner actually holds >= 1 player token before attempting sell
        PlayerMarket.PlayerInfo memory info = _market.getPlayerInfo(playerId);
        if (info.token == address(0)) return;
        if (info.supply == 0) return;

        PlayerToken pt = PlayerToken(info.token);
        if (pt.balanceOf(burner) < KickTypes.SHARE_UNIT) return;

        (uint256 netProceeds,) = _market.quoteSell(playerId, 1);
        uint256 minNet = netProceeds - (netProceeds / 20);
        _market.sell(playerId, 1, minNet);
        _totalSells++;
    }

    function _trackHolding(
        uint256[] memory holdings,
        uint256 count,
        uint256 playerId
    ) internal pure returns (uint256) {
        for (uint256 h = 0; h < count; h++) {
            if (holdings[h] == playerId) return count;
        }
        if (count < MAX_HOLDINGS) {
            holdings[count] = playerId;
            return count + 1;
        }
        return count;
    }

    function _weightedRandomPlayer(uint256 seed) internal pure returns (uint256) {
        uint256 roll = seed % TOTAL_WEIGHT;
        if (roll < TIER1_END * 3) {
            return (roll / 3) + 1;
        } else if (roll < TIER1_END * 3 + (TIER2_END - TIER1_END) * 2) {
            return (roll - TIER1_END * 3) / 2 + TIER1_END + 1;
        } else {
            return roll - TIER1_END * 3 - (TIER2_END - TIER1_END) * 2 + TIER2_END + 1;
        }
    }
}
