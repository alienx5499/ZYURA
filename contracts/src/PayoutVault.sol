// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PayoutVault
 * @dev Vault for managing insurance payouts
 * @notice Handles payout distribution and fund management
 */
contract PayoutVault is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant INSURANCE_ROLE = keccak256("INSURANCE_ROLE");

    IERC20 public usdc;
    address public insuranceContract;
    
    uint256 public totalPayouts;
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    
    // Maximum payout per transaction (safety measure)
    uint256 public maxPayoutAmount;
    
    // Daily payout limit
    uint256 public dailyPayoutLimit;
    uint256 public dailyPayoutUsed;
    uint256 public lastResetDay;

    event PayoutTransferred(
        address indexed to,
        uint256 amount,
        uint256 totalPayouts
    );

    event FundsDeposited(
        address indexed from,
        uint256 amount,
        uint256 totalDeposits
    );

    event FundsWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 totalWithdrawals
    );

    event MaxPayoutAmountUpdated(uint256 newAmount);
    event DailyPayoutLimitUpdated(uint256 newLimit);
    event InsuranceContractUpdated(address newContract);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdc,
        address _insuranceContract,
        uint256 _maxPayoutAmount,
        uint256 _dailyPayoutLimit
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        insuranceContract = _insuranceContract;
        maxPayoutAmount = _maxPayoutAmount;
        dailyPayoutLimit = _dailyPayoutLimit;
        lastResetDay = block.timestamp / 1 days;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
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
        require(amount <= maxPayoutAmount, "Amount exceeds max payout");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        // Check daily limit
        _checkDailyLimit(amount);

        usdc.safeTransfer(to, amount);
        totalPayouts += amount;
        dailyPayoutUsed += amount;

        emit PayoutTransferred(to, amount, totalPayouts);
        return true;
    }

    /**
     * @dev Deposit funds to payout vault
     * @param amount Amount to deposit
     */
    function depositFunds(uint256 amount) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposits += amount;

        emit FundsDeposited(msg.sender, amount, totalDeposits);
    }

    /**
     * @dev Withdraw excess funds (admin only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawFunds(address to, uint256 amount) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdc.safeTransfer(to, amount);
        totalWithdrawals += amount;

        emit FundsWithdrawn(to, amount, totalWithdrawals);
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
     * @dev Set maximum payout amount per transaction
     * @param _maxPayoutAmount New maximum amount
     */
    function setMaxPayoutAmount(uint256 _maxPayoutAmount) external onlyRole(ADMIN_ROLE) {
        require(_maxPayoutAmount > 0, "Max payout must be greater than 0");
        maxPayoutAmount = _maxPayoutAmount;
        emit MaxPayoutAmountUpdated(_maxPayoutAmount);
    }

    /**
     * @dev Set daily payout limit
     * @param _dailyPayoutLimit New daily limit
     */
    function setDailyPayoutLimit(uint256 _dailyPayoutLimit) external onlyRole(ADMIN_ROLE) {
        dailyPayoutLimit = _dailyPayoutLimit;
        emit DailyPayoutLimitUpdated(_dailyPayoutLimit);
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
     * @dev Reset daily payout counter (admin only)
     */
    function resetDailyPayout() external onlyRole(ADMIN_ROLE) {
        dailyPayoutUsed = 0;
        lastResetDay = block.timestamp / 1 days;
    }

    /**
     * @dev Check daily payout limit
     * @param amount Amount to check
     */
    function _checkDailyLimit(uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset daily counter if new day
        if (currentDay > lastResetDay) {
            dailyPayoutUsed = 0;
            lastResetDay = currentDay;
        }
        
        require(
            dailyPayoutUsed + amount <= dailyPayoutLimit,
            "Daily payout limit exceeded"
        );
    }

    /**
     * @dev Get vault balance
     * @return Current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Get remaining daily payout limit
     * @return Remaining amount for today
     */
    function getRemainingDailyLimit() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        
        if (currentDay > lastResetDay) {
            return dailyPayoutLimit;
        }
        
        return dailyPayoutLimit > dailyPayoutUsed ? dailyPayoutLimit - dailyPayoutUsed : 0;
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
