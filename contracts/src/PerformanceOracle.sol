// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {KickTypes} from "./libraries/KickTypes.sol";

/// @title IPlayerMarket — minimal interface for oracle callbacks
interface IPlayerMarket {
    function distribute(uint256 playerId, KickTypes.StatType statType, uint256 amount) external;
}

/// @title PerformanceOracle
/// @notice Pushes match performance stats to PlayerMarket, triggering dividend distributions.
///         Only the contract owner (trusted off-chain oracle operator) can push stats.
/// @dev Each StatType has a configurable reward amount (in mUSDT, 18 decimals).
///      When a stat is pushed, the oracle calls `market.distribute(playerId, statType, reward)`
///      which deducts from the player's dividendBudget and accrues to holders.
contract PerformanceOracle is Ownable {
    // ── State ─────────────────────────────────────────────────────
    IPlayerMarket public market;

    /// @notice Reward amount (in USDT) for each stat type.
    mapping(KickTypes.StatType => uint256) public statReward;

    // ── Events ────────────────────────────────────────────────────
    event StatPushed(uint256 indexed playerId, KickTypes.StatType statType, uint256 reward);
    event StatBatchPushed(uint256 count);
    event StatRewardUpdated(KickTypes.StatType statType, uint256 reward);
    event MarketUpdated(address indexed oldMarket, address indexed newMarket);

    // ── Constructor ───────────────────────────────────────────────
    constructor(address market_) Ownable(msg.sender) {
        if (market_ == address(0)) revert KickTypes.InvalidParam();
        market = IPlayerMarket(market_);

        // Default rewards (in mUSDT with 18 decimals)
        statReward[KickTypes.StatType.GOAL]         = 50e18;
        statReward[KickTypes.StatType.ASSIST]       = 25e18;
        statReward[KickTypes.StatType.CLEAN_SHEET]  = 20e18;
        statReward[KickTypes.StatType.MOTM]         = 30e18;
        statReward[KickTypes.StatType.RED_CARD]     = 0;  // no reward for red cards
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  PUSH STATS
    // ═══════════════════════════════════════════════════════════════

    /// @notice Push a single stat for a player. Triggers dividend distribution.
    /// @param playerId The player who earned the stat.
    /// @param statType The type of stat (GOAL, ASSIST, etc.).
    function pushStat(uint256 playerId, KickTypes.StatType statType) external onlyOwner {
        uint256 reward = statReward[statType];
        if (reward == 0) revert KickTypes.ZeroAmount();

        market.distribute(playerId, statType, reward);
        emit StatPushed(playerId, statType, reward);
    }

    /// @notice Push a batch of stats for one match round.
    /// @param playerIds Array of player IDs.
    /// @param statTypes Array of stat types, aligned 1:1 with playerIds.
    function pushBatch(uint256[] calldata playerIds, KickTypes.StatType[] calldata statTypes) external onlyOwner {
        uint256 len = playerIds.length;
        if (len != statTypes.length) revert KickTypes.InvalidParam();
        if (len == 0) revert KickTypes.ZeroAmount();

        for (uint256 i; i < len; ++i) {
            uint256 reward = statReward[statTypes[i]];
            if (reward == 0) continue; // skip zero-reward stats (e.g. RED_CARD)

            market.distribute(playerIds[i], statTypes[i], reward);
            emit StatPushed(playerIds[i], statTypes[i], reward);
        }

        emit StatBatchPushed(len);
    }

    // ═══════════════════════════════════════════════════════════════
    // ██  ADMIN
    // ═══════════════════════════════════════════════════════════════

    /// @notice Update the reward for a given stat type.
    function setStatReward(KickTypes.StatType statType, uint256 reward) external onlyOwner {
        statReward[statType] = reward;
        emit StatRewardUpdated(statType, reward);
    }

    /// @notice Update the market address.
    function setMarket(address market_) external onlyOwner {
        if (market_ == address(0)) revert KickTypes.InvalidParam();
        emit MarketUpdated(address(market), market_);
        market = IPlayerMarket(market_);
    }
}
