// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./PolicyRegistry.sol";

/**
 * @title FlightOracleAdapter
 * @dev Oracle adapter for flight status data
 * @notice Processes flight status updates and determines policy triggers
 */
contract FlightOracleAdapter is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct FlightStatus {
        string flightNumber;
        string airline;
        uint256 scheduledDeparture;
        uint256 actualDeparture;
        uint256 scheduledArrival;
        uint256 actualArrival;
        bool isCancelled;
        bool isDelayed;
        uint256 delayMinutes;
        string status; // "on-time", "delayed", "cancelled", "departed", "arrived"
        uint256 timestamp;
        string departureAirport;
        string arrivalAirport;
    }

    struct OracleData {
        address oracle;
        uint256 timestamp;
        bool isValid;
    }

    // Flight status data
    mapping(string => FlightStatus) public flightStatuses;
    mapping(string => OracleData) public oracleData;
    
    // Policy registry reference
    PolicyRegistry public policyRegistry;
    
    // Oracle configuration
    uint256 public dataValidityPeriod; // How long data is valid (in seconds)
    uint256 public maxDelayThreshold; // Maximum delay threshold (in minutes)
    
    // Events
    event FlightStatusUpdated(
        string indexed flightNumber,
        bool isCancelled,
        bool isDelayed,
        uint256 delayMinutes,
        uint256 timestamp
    );

    event PolicyTriggered(
        string indexed flightNumber,
        uint256 indexed policyId,
        bool triggered,
        string reason
    );

    event DataValidityPeriodUpdated(uint256 newPeriod);
    event MaxDelayThresholdUpdated(uint256 newThreshold);
    event PolicyRegistryUpdated(address newRegistry);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _policyRegistry,
        uint256 _dataValidityPeriod,
        uint256 _maxDelayThreshold
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        policyRegistry = PolicyRegistry(_policyRegistry);
        dataValidityPeriod = _dataValidityPeriod;
        maxDelayThreshold = _maxDelayThreshold;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Update flight status from oracle
     * @param status Flight status data
     */
    function updateFlightStatus(FlightStatus memory status) external onlyRole(ORACLE_ROLE) whenNotPaused {
        require(bytes(status.flightNumber).length > 0, "Invalid flight number");
        require(status.timestamp > 0, "Invalid timestamp");
        require(status.timestamp <= block.timestamp, "Future timestamp not allowed");

        // Validate delay threshold
        if (status.isDelayed) {
            require(status.delayMinutes <= maxDelayThreshold, "Delay exceeds maximum threshold");
        }

        // Store flight status
        flightStatuses[status.flightNumber] = status;
        
        // Store oracle data
        oracleData[status.flightNumber] = OracleData({
            oracle: msg.sender,
            timestamp: block.timestamp,
            isValid: true
        });

        emit FlightStatusUpdated(
            status.flightNumber,
            status.isCancelled,
            status.isDelayed,
            status.delayMinutes,
            status.timestamp
        );

        // Check and trigger policies for this flight
        _checkFlightPolicies(status.flightNumber);
    }

    /**
     * @dev Check if a policy should be triggered based on flight status
     * @param policy Policy data
     * @param status Flight status data
     * @return triggered Whether the policy should be triggered
     */
    function checkPolicyTrigger(
        PolicyRegistry.Policy memory policy,
        FlightStatus memory status
    ) external view returns (bool) {
        return _checkPolicyTrigger(policy, status);
    }

    /**
     * @dev Get flight status
     * @param flightNumber Flight number
     * @return Flight status data
     */
    function getFlightStatus(string memory flightNumber) external view returns (FlightStatus memory) {
        return flightStatuses[flightNumber];
    }

    /**
     * @dev Check if flight data is valid
     * @param flightNumber Flight number
     * @return valid Whether the data is still valid
     */
    function isFlightDataValid(string memory flightNumber) external view returns (bool) {
        OracleData memory data = oracleData[flightNumber];
        if (!data.isValid) return false;
        
        return (block.timestamp - data.timestamp) <= dataValidityPeriod;
    }

    /**
     * @dev Set data validity period
     * @param _dataValidityPeriod New validity period in seconds
     */
    function setDataValidityPeriod(uint256 _dataValidityPeriod) external onlyRole(ADMIN_ROLE) {
        require(_dataValidityPeriod > 0, "Invalid validity period");
        dataValidityPeriod = _dataValidityPeriod;
        emit DataValidityPeriodUpdated(_dataValidityPeriod);
    }

    /**
     * @dev Set maximum delay threshold
     * @param _maxDelayThreshold New maximum delay in minutes
     */
    function setMaxDelayThreshold(uint256 _maxDelayThreshold) external onlyRole(ADMIN_ROLE) {
        require(_maxDelayThreshold > 0, "Invalid delay threshold");
        maxDelayThreshold = _maxDelayThreshold;
        emit MaxDelayThresholdUpdated(_maxDelayThreshold);
    }

    /**
     * @dev Set policy registry address
     * @param _policyRegistry New policy registry address
     */
    function setPolicyRegistry(address _policyRegistry) external onlyRole(ADMIN_ROLE) {
        require(_policyRegistry != address(0), "Invalid policy registry");
        policyRegistry = PolicyRegistry(_policyRegistry);
        emit PolicyRegistryUpdated(_policyRegistry);
    }

    /**
     * @dev Invalidate flight data
     * @param flightNumber Flight number to invalidate
     */
    function invalidateFlightData(string memory flightNumber) external onlyRole(ADMIN_ROLE) {
        oracleData[flightNumber].isValid = false;
    }

    /**
     * @dev Check policies for a specific flight
     * @param flightNumber Flight number
     */
    function _checkFlightPolicies(string memory flightNumber) internal {
        FlightStatus memory status = flightStatuses[flightNumber];
        
        // Get all policies for this flight
        uint256[] memory policyIds = policyRegistry.getFlightPolicies(flightNumber);
        
        for (uint256 i = 0; i < policyIds.length; i++) {
            uint256 policyId = policyIds[i];
            PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);
            
            // Only check active policies
            if (policy.status != PolicyRegistry.PolicyStatus.Active) {
                continue;
            }
            
            bool triggered = _checkPolicyTrigger(policy, status);
            string memory reason = triggered ? _getTriggerReason(policy, status) : "No trigger conditions met";
            
            emit PolicyTriggered(flightNumber, policyId, triggered, reason);
        }
    }

    /**
     * @dev Check if policy should be triggered
     * @param policy Policy data
     * @param status Flight status data
     * @return triggered Whether policy should be triggered
     */
    function _checkPolicyTrigger(
        PolicyRegistry.Policy memory policy,
        FlightStatus memory status
    ) internal pure returns (bool) {
        // Check if flight numbers match
        if (keccak256(bytes(policy.flightNumber)) != keccak256(bytes(status.flightNumber))) {
            return false;
        }

        // Check if airports match
        if (keccak256(bytes(policy.departureAirport)) != keccak256(bytes(status.departureAirport))) {
            return false;
        }
        if (keccak256(bytes(policy.arrivalAirport)) != keccak256(bytes(status.arrivalAirport))) {
            return false;
        }

        // Check cancellation
        if (policy.coversCancellation && status.isCancelled) {
            return true;
        }

        // Check delay threshold
        if (status.isDelayed && status.delayMinutes >= policy.delayThresholdMinutes) {
            return true;
        }

        return false;
    }

    /**
     * @dev Get trigger reason for policy
     * @param policy Policy data
     * @param status Flight status data
     * @return reason Trigger reason
     */
    function _getTriggerReason(
        PolicyRegistry.Policy memory policy,
        FlightStatus memory status
    ) internal pure returns (string memory) {
        if (status.isCancelled && policy.coversCancellation) {
            return "Flight cancelled";
        }
        
        if (status.isDelayed && status.delayMinutes >= policy.delayThresholdMinutes) {
            return string(abi.encodePacked("Delay exceeded threshold: ", _uint2str(status.delayMinutes), " minutes"));
        }
        
        return "Unknown trigger";
    }

    /**
     * @dev Convert uint to string
     * @param _i Number to convert
     * @return String representation
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
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
