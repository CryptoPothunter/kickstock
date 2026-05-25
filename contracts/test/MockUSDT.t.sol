// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {KickTypes} from "../src/libraries/KickTypes.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MockUSDTTest is Test {
    MockUSDT internal usdt;
    address internal owner = address(this);
    address internal user = address(0xBEEF);

    function setUp() public {
        usdt = new MockUSDT();
    }

    function test_metadata() public view {
        assertEq(usdt.decimals(), 18, "18 decimals");
        assertEq(usdt.symbol(), "mUSDT");
        assertEq(usdt.owner(), owner);
    }

    function test_faucet_mintsDefaultAmount() public {
        vm.prank(user);
        usdt.faucet();
        assertEq(usdt.balanceOf(user), 1_000e18, "faucet amount");
    }

    function test_faucet_noCooldownByDefault() public {
        vm.startPrank(user);
        usdt.faucet();
        usdt.faucet();
        vm.stopPrank();
        assertEq(usdt.balanceOf(user), 2_000e18);
    }

    function test_faucet_respectsCooldown() public {
        vm.warp(1_000);
        usdt.setFaucetConfig(500e18, 1 hours);
        vm.startPrank(user);
        usdt.faucet();
        uint256 ready = 1_000 + 1 hours;
        vm.expectRevert(abi.encodeWithSelector(KickTypes.FaucetCooldown.selector, ready));
        usdt.faucet();
        vm.warp(ready + 1);
        usdt.faucet();
        vm.stopPrank();
        assertEq(usdt.balanceOf(user), 1_000e18);
    }

    function test_faucet_firstClaimAllowedAtLowTimestamp() public {
        usdt.setFaucetConfig(500e18, 1 hours);
        vm.warp(10);
        vm.prank(user);
        usdt.faucet();
        assertEq(usdt.balanceOf(user), 500e18, "first claim must succeed");
    }

    function test_mint_onlyOwner() public {
        usdt.mint(user, 5_000e18);
        assertEq(usdt.balanceOf(user), 5_000e18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        usdt.mint(user, 1e18);
    }

    function test_setFaucetConfig_zeroReverts() public {
        vm.expectRevert(KickTypes.ZeroAmount.selector);
        usdt.setFaucetConfig(0, 0);
    }
}
