// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FlightInsurance.sol";
import "../src/PolicyRegistry.sol";
import "../src/PremiumVault.sol";
import "../src/PayoutVault.sol";
import "../src/FlightOracleAdapter.sol";

contract DeployLocal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying locally with:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Mock USDC (6 decimals)
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));

        // Core contracts (constructor-based)
        PolicyRegistry policyRegistry = new PolicyRegistry();
        console.log("PolicyRegistry:", address(policyRegistry));

        PremiumVault premiumVault = new PremiumVault(
            address(usdc),
            address(0),
            2000 // 20% reserve ratio
        );
        console.log("PremiumVault:", address(premiumVault));

        PayoutVault payoutVault = new PayoutVault(
            address(usdc),
            address(0),
            10_000 * 1e6,
            100_000 * 1e6
        );
        console.log("PayoutVault:", address(payoutVault));

        FlightOracleAdapter oracleAdapter = new FlightOracleAdapter(
            address(policyRegistry),
            3600,
            1440
        );
        console.log("OracleAdapter:", address(oracleAdapter));

        FlightInsurance flightInsurance = new FlightInsurance(
            address(policyRegistry),
            address(premiumVault),
            address(payoutVault),
            address(oracleAdapter),
            address(usdc),
            deployer,
            500
        );
        console.log("FlightInsurance:", address(flightInsurance));

        // Roles
        policyRegistry.grantRole(policyRegistry.INSURANCE_ROLE(), address(flightInsurance));
        premiumVault.grantRole(premiumVault.INSURANCE_ROLE(), address(flightInsurance));
        payoutVault.grantRole(payoutVault.INSURANCE_ROLE(), address(flightInsurance));
        oracleAdapter.grantRole(oracleAdapter.ORACLE_ROLE(), deployer);

        // Wire vaults
        premiumVault.setInsuranceContract(address(flightInsurance));
        payoutVault.setInsuranceContract(address(flightInsurance));

        // Fund payout vault for testing
        usdc.mint(address(payoutVault), 200_000 * 1e6);

        vm.stopBroadcast();

        console.log("\n=== Local Deployment Summary ===");
        console.log("USDC:", address(usdc));
        console.log("PolicyRegistry:", address(policyRegistry));
        console.log("PremiumVault:", address(premiumVault));
        console.log("PayoutVault:", address(payoutVault));
        console.log("OracleAdapter:", address(oracleAdapter));
        console.log("FlightInsurance:", address(flightInsurance));
    }
}


