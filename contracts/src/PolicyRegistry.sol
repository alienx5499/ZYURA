// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PolicyRegistry
 * @dev Registry for storing flight insurance policies
 * @notice Manages policy lifecycle and data storage
 */
contract PolicyRegistry is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSURANCE_ROLE = keccak256("INSURANCE_ROLE");

    enum PolicyStatus {
        Active,
        Claimed,
        Expired,
        Cancelled
    }

    struct Policy {
        uint256 policyId;
        address policyholder;
        string flightNumber;
        string airline;
        uint256 departureTime;
        string departureAirport;
        string arrivalAirport;
        uint256 premiumAmount;
        uint256 payoutAmount;
        uint256 delayThresholdMinutes;
        bool coversCancellation;
        PolicyStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    mapping(string => uint256[]) public flightPolicies; // flightNumber => policyIds
    
    uint256 public nextPolicyId;
    uint256 public totalPolicies;

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed policyholder,
        string flightNumber,
        uint256 premiumAmount,
        uint256 payoutAmount
    );

    event PolicyStatusUpdated(
        uint256 indexed policyId,
        PolicyStatus oldStatus,
        PolicyStatus newStatus
    );

    event PolicyCancelled(uint256 indexed policyId, address indexed policyholder);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        nextPolicyId = 1;
    }

    /**
     * @dev Create a new policy
     * @param policyholder Address of the policyholder
     * @param flightNumber Flight number
     * @param airline Airline code
     * @param departureTime Departure timestamp
     * @param departureAirport Departure airport code
     * @param arrivalAirport Arrival airport code
     * @param premiumAmount Premium amount in USDC
     * @param payoutAmount Payout amount in USDC
     * @param delayThresholdMinutes Delay threshold in minutes
     * @param coversCancellation Whether policy covers cancellation
     * @return policyId The created policy ID
     */
    function createPolicy(
        address policyholder,
        string memory flightNumber,
        string memory airline,
        uint256 departureTime,
        string memory departureAirport,
        string memory arrivalAirport,
        uint256 premiumAmount,
        uint256 payoutAmount,
        uint256 delayThresholdMinutes,
        bool coversCancellation
    ) external onlyRole(INSURANCE_ROLE) returns (uint256) {
        uint256 policyId = nextPolicyId++;
        
        Policy memory newPolicy = Policy({
            policyId: policyId,
            policyholder: policyholder,
            flightNumber: flightNumber,
            airline: airline,
            departureTime: departureTime,
            departureAirport: departureAirport,
            arrivalAirport: arrivalAirport,
            premiumAmount: premiumAmount,
            payoutAmount: payoutAmount,
            delayThresholdMinutes: delayThresholdMinutes,
            coversCancellation: coversCancellation,
            status: PolicyStatus.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        policies[policyId] = newPolicy;
        userPolicies[policyholder].push(policyId);
        flightPolicies[flightNumber].push(policyId);
        totalPolicies++;

        emit PolicyCreated(
            policyId,
            policyholder,
            flightNumber,
            premiumAmount,
            payoutAmount
        );

        return policyId;
    }

    /**
     * @dev Get policy details
     * @param policyId Policy ID
     * @return Policy struct
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        require(policyExists(policyId), "Policy does not exist");
        return policies[policyId];
    }

    /**
     * @dev Check if policy exists
     * @param policyId Policy ID
     * @return bool True if policy exists
     */
    function policyExists(uint256 policyId) public view returns (bool) {
        return policies[policyId].policyId != 0;
    }

    /**
     * @dev Update policy status
     * @param policyId Policy ID
     * @param newStatus New policy status
     */
    function updatePolicyStatus(
        uint256 policyId,
        PolicyStatus newStatus
    ) external onlyRole(INSURANCE_ROLE) {
        require(policyExists(policyId), "Policy does not exist");
        
        Policy storage policy = policies[policyId];
        PolicyStatus oldStatus = policy.status;
        
        require(
            newStatus != PolicyStatus.Active || oldStatus == PolicyStatus.Active,
            "Invalid status transition"
        );

        policy.status = newStatus;
        policy.updatedAt = block.timestamp;

        emit PolicyStatusUpdated(policyId, oldStatus, newStatus);
    }

    /**
     * @dev Cancel a policy (refund scenario)
     * @param policyId Policy ID to cancel
     */
    function cancelPolicy(uint256 policyId) external onlyRole(INSURANCE_ROLE) {
        require(policyExists(policyId), "Policy does not exist");
        
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.Active, "Policy not active");
        
        policy.status = PolicyStatus.Cancelled;
        policy.updatedAt = block.timestamp;

        emit PolicyCancelled(policyId, policy.policyholder);
    }

    /**
     * @dev Get user's policies
     * @param user User address
     * @return Array of policy IDs
     */
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    /**
     * @dev Get policies for a specific flight
     * @param flightNumber Flight number
     * @return Array of policy IDs
     */
    function getFlightPolicies(string memory flightNumber) external view returns (uint256[] memory) {
        return flightPolicies[flightNumber];
    }

    /**
     * @dev Get active policies count
     * @return Number of active policies
     */
    function getActivePoliciesCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextPolicyId; i++) {
            if (policies[i].status == PolicyStatus.Active) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get policies by status
     * @param status Policy status to filter by
     * @return Array of policy IDs
     */
    function getPoliciesByStatus(PolicyStatus status) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](totalPolicies);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextPolicyId; i++) {
            if (policies[i].status == status) {
                result[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }

    /**
     * @dev Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}
