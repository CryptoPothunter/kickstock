// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

/// @title FundTraders
/// @notice Generates N burner wallets (deterministic from a seed), mints MockUSDT to each,
///         and sends a small amount of native OKB for gas. The burner keys are derived as:
///           burnerKey[i] = keccak256(abi.encodePacked("kickstock-burner", i))
///         This script is idempotent — re-running will top-up existing burners.
contract FundTraders is Script {
    /// @dev Number of burner wallets to fund
    uint256 constant NUM_BURNERS = 20;

    /// @dev mUSDT to mint per burner (10,000 mUSDT)
    uint256 constant USDT_PER_BURNER = 10_000e18;

    /// @dev OKB gas to send per burner (0.01 OKB)
    uint256 constant GAS_PER_BURNER = 0.01 ether;

    function run() external {
        uint256 deployerKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        address usdtAddr = vm.envAddress("MOCK_USDT");

        MockUSDT usdt = MockUSDT(usdtAddr);
        console2.log("MockUSDT:", usdtAddr);
        console2.log("Funding", NUM_BURNERS, "burner wallets");

        vm.startBroadcast(deployerKey);

        for (uint256 i = 0; i < NUM_BURNERS; i++) {
            // Deterministic burner key derivation
            uint256 burnerKey = uint256(keccak256(abi.encodePacked("kickstock-burner", i)));
            address burner = vm.addr(burnerKey);

            // Mint mUSDT to burner
            usdt.mint(burner, USDT_PER_BURNER);

            // Send gas OKB
            (bool ok,) = burner.call{value: GAS_PER_BURNER}("");
            require(ok, "OKB transfer failed");

            console2.log("Burner", i, ":", burner);
        }

        vm.stopBroadcast();

        // Log all burner addresses + private keys for reference
        console2.log("\n=== Burner Wallet Summary ===");
        for (uint256 i = 0; i < NUM_BURNERS; i++) {
            uint256 burnerKey = uint256(keccak256(abi.encodePacked("kickstock-burner", i)));
            address burner = vm.addr(burnerKey);
            console2.log("  [", i, "]", burner);
        }
    }
}
