// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PolicyRegistry.sol";
import "./PremiumVault.sol";
import "./PayoutVault.sol";
import "./FlightOracleAdapter.sol";

/**
 * @title FlightInsurance
 * @dev Main contract for parametric flight insurance
 * @notice Users can purchase flight delay/cancellation insurance policies
 */
contract FlightInsurance is 
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    PolicyRegistry public policyRegistry;
    PremiumVault public premiumVault;
    PayoutVault public payoutVault;
    FlightOracleAdapter public oracleAdapter;
    IERC20 public usdc;

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public platformFeeBps; // Platform fee in basis points
    address public feeRecipient;

    struct PolicyParams {
        string flightNumber;
        string airline;
        uint256 departureTime;
        string departureAirport;
        string arrivalAirport;
        uint256 premiumAmount;
        uint256 payoutAmount;
        uint256 delayThresholdMinutes;
        bool coversCancellation;
    }

    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed policyholder,
        string flightNumber,
        uint256 premiumAmount,
        uint256 payoutAmount
    );

    event PolicyResolved(
        uint256 indexed policyId,
        bool triggered,
        uint256 payoutAmount
    );

    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) ERC2771ContextUpgradeable(trustedForwarder) {
        _disableInitializers();
    }

    function initialize(
        address _policyRegistry,
        address _premiumVault,
        address _payoutVault,
        address _oracleAdapter,
        address _usdc,
        address _feeRecipient,
        uint256 _platformFeeBps
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        policyRegistry = PolicyRegistry(_policyRegistry);
        premiumVault = PremiumVault(_premiumVault);
        payoutVault = PayoutVault(_payoutVault);
        oracleAdapter = FlightOracleAdapter(_oracleAdapter);
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Purchase a flight insurance policy
     * @param params Policy parameters including flight details and coverage
     */
    function purchasePolicy(PolicyParams memory params) external whenNotPaused {
        require(params.premiumAmount > 0, "Premium must be greater than 0");
        require(params.payoutAmount > 0, "Payout must be greater than 0");
        require(params.departureTime > block.timestamp, "Departure time must be in the future");

        // Calculate platform fee
        uint256 platformFee = (params.premiumAmount * platformFeeBps) / BASIS_POINTS;
        uint256 netPremium = params.premiumAmount - platformFee;

        // Transfer USDC from user to premium vault
        require(
            usdc.transferFrom(msg.sender, address(premiumVault), params.premiumAmount),
            "USDC transfer failed"
        );

        // Transfer platform fee to fee recipient
        if (platformFee > 0) {
            require(
                usdc.transferFrom(msg.sender, feeRecipient, platformFee),
                "Fee transfer failed"
            );
        }

        // Create policy in registry
        uint256 policyId = policyRegistry.createPolicy(
            msg.sender,
            params.flightNumber,
            params.airline,
            params.departureTime,
            params.departureAirport,
            params.arrivalAirport,
            netPremium,
            params.payoutAmount,
            params.delayThresholdMinutes,
            params.coversCancellation
        );

        emit PolicyPurchased(
            policyId,
            msg.sender,
            params.flightNumber,
            params.premiumAmount,
            params.payoutAmount
        );
    }

    /**
     * @dev Resolve a policy based on flight status
     * @param policyId Policy ID to resolve
     * @param flightStatus Flight status data from oracle
     */
    function resolvePolicy(
        uint256 policyId,
        FlightOracleAdapter.FlightStatus memory flightStatus
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        require(policyRegistry.policyExists(policyId), "Policy does not exist");
        
        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);
        require(policy.status == PolicyRegistry.PolicyStatus.Active, "Policy not active");

        bool triggered = oracleAdapter.checkPolicyTrigger(policy, flightStatus);
        uint256 payoutAmount = 0;

        if (triggered) {
            payoutAmount = policy.payoutAmount;
            
            // Transfer payout from payout vault to policyholder
            require(
                payoutVault.transferTo(policy.policyholder, payoutAmount),
                "Payout transfer failed"
            );
        }

        // Update policy status
        policyRegistry.updatePolicyStatus(
            policyId,
            triggered ? PolicyRegistry.PolicyStatus.Claimed : PolicyRegistry.PolicyStatus.Expired
        );

        emit PolicyResolved(policyId, triggered, payoutAmount);
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 _platformFeeBps) external onlyRole(ADMIN_ROLE) {
        require(_platformFeeBps <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeeBps = _platformFeeBps;
        emit PlatformFeeUpdated(_platformFeeBps);
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyRole(ADMIN_ROLE) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
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

    /**
     * @dev Override _msgSender for ERC2771Context
     */
    function _msgSender() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (address) {
        return super._msgSender();
    }

    /**
     * @dev Override _msgData for ERC2771Context
     */
    function _msgData() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (bytes calldata) {
        return super._msgData();
    }

    /**
     * @dev Override _contextSuffixLength for ERC2771Context
     */
    function _contextSuffixLength() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (uint256) {
        return super._contextSuffixLength();
    }
}
