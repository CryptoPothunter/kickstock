// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {PlayerToken} from "../src/PlayerToken.sol";
import {PlayerTokenFactory} from "../src/PlayerTokenFactory.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";
import {PerformanceOracle} from "../src/PerformanceOracle.sol";

/// @title Deploy
/// @notice Deploys the full KickStock contract suite on X Layer Testnet (chainId 195).
///         Wiring order: MockUSDT → Factory → PlayerMarket → PerformanceOracle
///         Then: market.setOracle(oracle)
///         Writes deployment addresses to stdout for capture into deployments/xlayer-testnet.json.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. MockUSDT — settlement currency
        MockUSDT usdt = new MockUSDT();
        console2.log("MockUSDT:", address(usdt));

        // 2. PlayerTokenFactory — EIP-1167 clone factory
        PlayerTokenFactory factory = new PlayerTokenFactory();
        console2.log("PlayerTokenFactory:", address(factory));
        console2.log("  implementation:", factory.implementation());

        // 3. PlayerMarket — primary market with bonding curve
        PlayerMarket market = new PlayerMarket(address(usdt), address(factory));
        console2.log("PlayerMarket:", address(market));

        // 4. PerformanceOracle — stat push + dividend distribution
        PerformanceOracle oracle = new PerformanceOracle(address(market));
        console2.log("PerformanceOracle:", address(oracle));

        // ── Wiring ───────────────────────────────────────────────────
        // Wire oracle into market for distribute() access control
        market.setOracle(address(oracle));
        console2.log("Wiring: market.setOracle =>", address(oracle));

        // Set curve parameters (defaults are fine, but explicit for clarity)
        // curveBase = 100e18, curveSlope = 10e18, feeBps = 300
        // These are already the defaults in PlayerMarket constructor

        vm.stopBroadcast();

        // ── Output JSON for deployments file ─────────────────────────
        _writeDeploymentJson(
            deployer,
            address(usdt),
            address(factory),
            factory.implementation(),
            address(market),
            address(oracle)
        );
    }

    function _writeDeploymentJson(
        address deployer,
        address usdt,
        address factory,
        address implementation,
        address market,
        address oracle
    ) internal view {
        string memory json = string.concat(
            '{\n',
            '  "network": "xlayer-testnet",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "contracts": {\n',
            '    "MockUSDT": "', vm.toString(usdt), '",\n',
            '    "PlayerTokenFactory": "', vm.toString(factory), '",\n',
            '    "PlayerToken_implementation": "', vm.toString(implementation), '",\n',
            '    "PlayerMarket": "', vm.toString(market), '",\n',
            '    "PerformanceOracle": "', vm.toString(oracle), '"\n',
            '  },\n',
            '  "params": {\n',
            '    "curveBase": "100000000000000000000",\n',
            '    "curveSlope": "10000000000000000000",\n',
            '    "feeBps": 300,\n',
            '    "referralBps": 3000,\n',
            '    "divShareBps": 5000\n',
            '  }\n',
            '}'
        );

        console2.log("\n=== deployments/xlayer-testnet.json ===");
        console2.log(json);
    }
}
