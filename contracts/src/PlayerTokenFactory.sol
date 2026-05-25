// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";
import {PlayerToken} from "./PlayerToken.sol";

/// @title PlayerTokenFactory
/// @notice Deploys PlayerToken instances as EIP-1167 minimal proxy clones.
///         Called by PlayerMarket.listPlayer to cheaply deploy per-player ERC-20 tokens.
contract PlayerTokenFactory {
    /// @notice The PlayerToken implementation contract (template for clones).
    address public immutable implementation;

    /// @notice Emitted when a new PlayerToken clone is deployed.
    event TokenCreated(uint256 indexed playerId, address token);

    constructor() {
        implementation = address(new PlayerToken());
    }

    /// @notice Deploy a new PlayerToken clone for a given player.
    /// @param playerId The unique player identifier.
    /// @param name_ Token name, e.g. "KickStock Messi".
    /// @param symbol_ Token symbol, e.g. "KMESSI".
    /// @param market The PlayerMarket address (gets mint/burn/accrue rights).
    /// @param usdt The MockUSDT address (dividend settlement currency).
    /// @return token The address of the newly deployed PlayerToken clone.
    function createToken(
        uint256 playerId,
        string calldata name_,
        string calldata symbol_,
        address market,
        address usdt
    ) external returns (address token) {
        // Use playerId as salt for deterministic deployment
        bytes32 salt = keccak256(abi.encodePacked(playerId, market));
        token = Clones.cloneDeterministic(implementation, salt);
        PlayerToken(token).initialize(name_, symbol_, market, usdt);
        emit TokenCreated(playerId, token);
    }
}
