// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {KickTypes} from "./libraries/KickTypes.sol";

/// @title MockUSDT
/// @notice Test-net settlement currency for KickStock. 18-decimal ERC-20 with faucet + owner mint.
contract MockUSDT is ERC20, Ownable {
    uint256 public faucetAmount = 1_000e18;
    uint256 public faucetCooldown;
    mapping(address => uint256) public lastFaucet;

    event Faucet(address indexed to, uint256 amount);
    event FaucetConfigUpdated(uint256 amount, uint256 cooldown);

    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {}

    function faucet() external {
        uint256 last = lastFaucet[msg.sender];
        if (faucetCooldown != 0 && last != 0) {
            uint256 ready = last + faucetCooldown;
            if (block.timestamp < ready) revert KickTypes.FaucetCooldown(ready);
        }
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit Faucet(msg.sender, faucetAmount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function setFaucetConfig(uint256 amount, uint256 cooldown) external onlyOwner {
        if (amount == 0) revert KickTypes.ZeroAmount();
        faucetAmount = amount;
        faucetCooldown = cooldown;
        emit FaucetConfigUpdated(amount, cooldown);
    }
}
