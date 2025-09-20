// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/FlightInsurance.sol";
import "../src/PolicyRegistry.sol";
import "../src/PremiumVault.sol";
import "../src/PayoutVault.sol";
import "../src/FlightOracleAdapter.sol";

/**
 * @title Deploy
 * @dev Deployment script for flight insurance contracts
 */
contract Deploy is Script {
    // Arbitrum addresses
    address constant ARBITRUM_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // USDC on Arbitrum One
    address constant ARBITRUM_SEPOLIA_USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d; // USDC on Arbitrum Sepolia
    
    // Trusted forwarder for meta-transactions (Biconomy on Arbitrum)
    address constant TRUSTED_FORWARDER = 0x86C80A8aa58e0A4fA09a69624c31aB2A6CAD56A8; // Biconomy Forwarder on Arbitrum One
    address constant ARBITRUM_SEPOLIA_FORWARDER = 0x86C80A8aa58e0A4fA09a69624c31aB2A6CAD56A8; // Biconomy Forwarder on Arbitrum Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PolicyRegistry (non-upgradeable)
        PolicyRegistry policyRegistry = new PolicyRegistry();
        console.log("PolicyRegistry deployed at:", address(policyRegistry));

        // Deploy PremiumVault (constructor-based)
        PremiumVault premiumVault = new PremiumVault(
            ARBITRUM_USDC, // USDC address
            address(0), // Will be set after FlightInsurance deployment
            2000 // 20% reserve ratio
        );
        console.log("PremiumVault deployed at:", address(premiumVault));

        // Deploy PayoutVault (constructor-based)
        PayoutVault payoutVault = new PayoutVault(
            ARBITRUM_USDC, // USDC address
            address(0), // Will be set after FlightInsurance deployment
            10000 * 1e6, // Max payout: 10,000 USDC
            100000 * 1e6 // Daily limit: 100,000 USDC
        );
        console.log("PayoutVault deployed at:", address(payoutVault));

        // Deploy FlightOracleAdapter (constructor-based)
        FlightOracleAdapter oracleAdapter = new FlightOracleAdapter(
            address(policyRegistry),
            3600, // 1 hour data validity
            1440 // 24 hours max delay threshold
        );
        console.log("FlightOracleAdapter deployed at:", address(oracleAdapter));

        // Deploy FlightInsurance (constructor-based)
        FlightInsurance flightInsurance = new FlightInsurance(
            address(policyRegistry),
            address(premiumVault),
            address(payoutVault),
            address(oracleAdapter),
            ARBITRUM_USDC,
            deployer, // Fee recipient
            500 // 5% platform fee
        );
        console.log("FlightInsurance deployed at:", address(flightInsurance));

        // Set up roles and permissions
        policyRegistry.grantRole(policyRegistry.INSURANCE_ROLE(), address(flightInsurance));
        premiumVault.grantRole(premiumVault.INSURANCE_ROLE(), address(flightInsurance));
        payoutVault.grantRole(payoutVault.INSURANCE_ROLE(), address(flightInsurance));
        oracleAdapter.grantRole(oracleAdapter.ORACLE_ROLE(), deployer); // Will be updated with actual oracle

        // Update vault contracts with insurance contract address
        premiumVault.setInsuranceContract(address(flightInsurance));
        payoutVault.setInsuranceContract(address(flightInsurance));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("PolicyRegistry:", address(policyRegistry));
        console.log("PremiumVault:", address(premiumVault));
        console.log("PayoutVault:", address(payoutVault));
        console.log("FlightOracleAdapter:", address(oracleAdapter));
        console.log("FlightInsurance:", address(flightInsurance));
        console.log("USDC Token:", ARBITRUM_USDC);
        // Note: No trusted forwarder required after removing ERC2771
    }
}
