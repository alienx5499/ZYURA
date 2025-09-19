// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PremiumVault
 * @dev Vault for holding insurance premiums
 * @notice Manages premium collection and fund allocation
 */
contract PremiumVault is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant INSURANCE_ROLE = keccak256("INSURANCE_ROLE");

    IERC20 public usdc;
    address public insuranceContract;
    
    uint256 public totalPremiums;
    uint256 public totalReserves;
    uint256 public totalPayouts;
    
    // Reserve ratio: percentage of premiums kept as reserves
    uint256 public reserveRatioBps; // in basis points (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;

    event PremiumReceived(
        address indexed from,
        uint256 amount,
        uint256 totalPremiums
    );

    event ReserveAllocated(
        uint256 amount,
        uint256 totalReserves
    );

    event PayoutTransferred(
        address indexed to,
        uint256 amount,
        uint256 totalPayouts
    );

    event ReserveRatioUpdated(uint256 newRatioBps);
    event InsuranceContractUpdated(address newContract);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdc,
        address _insuranceContract,
        uint256 _reserveRatioBps
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        insuranceContract = _insuranceContract;
        reserveRatioBps = _reserveRatioBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Receive premium payment
     * @param from Address paying the premium
     * @param amount Premium amount
     */
    function receivePremium(address from, uint256 amount) external onlyRole(INSURANCE_ROLE) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from sender to this vault
        usdc.safeTransferFrom(from, address(this), amount);
        
        totalPremiums += amount;
        
        // Calculate reserve allocation
        uint256 reserveAmount = (amount * reserveRatioBps) / BASIS_POINTS;
        totalReserves += reserveAmount;

        emit PremiumReceived(from, amount, totalPremiums);
        emit ReserveAllocated(reserveAmount, totalReserves);
    }

    /**
     * @dev Transfer payout to policyholder
     * @param to Recipient address
     * @param amount Payout amount
     * @return success Whether transfer was successful
     */
    function transferTo(address to, uint256 amount) external onlyRole(INSURANCE_ROLE) whenNotPaused returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdc.safeTransfer(to, amount);
        totalPayouts += amount;

        emit PayoutTransferred(to, amount, totalPayouts);
        return true;
    }

    /**
     * @dev Transfer funds to payout vault for coverage
     * @param payoutVault Address of payout vault
     * @param amount Amount to transfer
     */
    function transferToPayoutVault(address payoutVault, uint256 amount) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(payoutVault != address(0), "Invalid payout vault");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdc.safeTransfer(payoutVault, amount);
    }

    /**
     * @dev Emergency withdrawal (admin only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdc.safeTransfer(to, amount);
    }

    /**
     * @dev Set reserve ratio
     * @param _reserveRatioBps New reserve ratio in basis points
     */
    function setReserveRatio(uint256 _reserveRatioBps) external onlyRole(ADMIN_ROLE) {
        require(_reserveRatioBps <= BASIS_POINTS, "Reserve ratio cannot exceed 100%");
        reserveRatioBps = _reserveRatioBps;
        emit ReserveRatioUpdated(_reserveRatioBps);
    }

    /**
     * @dev Set insurance contract address
     * @param _insuranceContract New insurance contract address
     */
    function setInsuranceContract(address _insuranceContract) external onlyRole(ADMIN_ROLE) {
        require(_insuranceContract != address(0), "Invalid insurance contract");
        insuranceContract = _insuranceContract;
        emit InsuranceContractUpdated(_insuranceContract);
    }

    /**
     * @dev Get vault balance
     * @return Current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Get available payout amount (total premiums - reserves)
     * @return Available amount for payouts
     */
    function getAvailablePayoutAmount() external view returns (uint256) {
        uint256 balance = usdc.balanceOf(address(this));
        return balance > totalReserves ? balance - totalReserves : 0;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}
