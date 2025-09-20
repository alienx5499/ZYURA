# Flight Insurance System Documentation

This documentation covers the complete flight insurance system built on Ethereum. The system allows users to purchase parametric insurance policies for flight delays and cancellations.

## 📋 **System Overview**

The flight insurance system consists of 5 main contracts that work together to provide decentralized flight insurance:

1. **FlightInsurance** - Main contract handling policy purchases and payouts
2. **PolicyRegistry** - Stores and manages all insurance policies
3. **PremiumVault** - Manages premium collection and reserves
4. **PayoutVault** - Handles payout distribution with safety limits
5. **FlightOracleAdapter** - Processes flight status data and triggers policies

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FlightInsurance│    │  PolicyRegistry │    │  PremiumVault   │
│   (Main Contract)│◄──►│  (Data Storage) │◄──►│  (Premium Mgmt) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│FlightOracleAdapter│   │   External      │    │   PayoutVault   │
│  (Flight Data)   │◄──►│   Oracles       │    │  (Payout Mgmt)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 **User Flow**

1. **Policy Purchase**: User pays USDC premium to purchase flight insurance
2. **Flight Monitoring**: Oracle provides real-time flight status updates
3. **Policy Resolution**: System automatically checks if policy conditions are met
4. **Payout Distribution**: If triggered, payout is sent to policyholder

## 📊 **Key Features**

- **Parametric Insurance**: Automatic payouts based on flight data
- **Upgradeable Contracts**: All contracts use UUPS proxy pattern
- **Role-Based Access**: Granular permissions for different functions
- **Pausable**: Emergency stop functionality
- **Gasless Transactions**: Support for meta-transactions via ERC2771
- **Reserve Management**: Automatic reserve allocation for sustainability
- **Daily Limits**: Safety mechanisms to prevent excessive payouts

## 💰 **Token Economics**

- **Premium Token**: USDC (6 decimals)
- **Platform Fee**: Configurable (default 5%)
- **Reserve Ratio**: Configurable (default 50%)
- **Max Payout**: Configurable per transaction
- **Daily Limit**: Configurable total daily payouts

## 🔐 **Security Features**

- **Access Control**: Role-based permissions
- **Pausable**: Emergency stop capability
- **Input Validation**: Comprehensive parameter checks
- **Safe Math**: OpenZeppelin SafeERC20 for token operations
- **Upgrade Authorization**: Only admin can upgrade contracts

---

# Contract Documentation

## 1. FlightInsurance Contract

### 📋 **Overview**

The `FlightInsurance` contract is the main entry point for the flight insurance system. It handles policy purchases, premium collection, and coordinates with other contracts to process payouts when flight conditions are met.

### 🎯 **Purpose**

- **Policy Management**: Users can purchase flight delay/cancellation insurance
- **Premium Processing**: Handles USDC payments and platform fees
- **Policy Resolution**: Coordinates with oracles to determine payouts
- **System Integration**: Connects all other contracts in the system

### 🏗️ **Inheritance**

```solidity
contract FlightInsurance is 
    AccessControlUpgradeable,    // Role-based access control
    PausableUpgradeable,         // Emergency pause functionality
    UUPSUpgradeable,             // Upgradeable proxy pattern
    ERC2771ContextUpgradeable    // Meta-transaction support
```

### 🔑 **Key Roles**

- **ADMIN_ROLE**: System administration and configuration
- **ORACLE_ROLE**: Flight status updates and policy resolution
- **VAULT_ROLE**: Vault management operations

### 📊 **Core Data Structures**

#### PolicyParams
```solidity
struct PolicyParams {
    string flightNumber;           // e.g., "AA123"
    string airline;                // e.g., "American Airlines"
    uint256 departureTime;         // Unix timestamp
    string departureAirport;       // e.g., "JFK"
    string arrivalAirport;         // e.g., "LAX"
    uint256 premiumAmount;         // USDC amount (6 decimals)
    uint256 payoutAmount;          // USDC payout (6 decimals)
    uint256 delayThresholdMinutes; // e.g., 120 (2 hours)
    bool coversCancellation;       // Whether covers flight cancellation
}
```

### 🔧 **Key Functions**

#### Policy Purchase
```solidity
function purchasePolicy(PolicyParams memory params) external whenNotPaused
```

**What it does:**
- Validates policy parameters
- Calculates platform fee (default 5%)
- Transfers USDC from user to premium vault
- Transfers platform fee to fee recipient
- Creates policy in registry
- Emits `PolicyPurchased` event

**Requirements:**
- Premium amount > 0
- Payout amount > 0
- Departure time in the future
- User has approved USDC spending

#### Policy Resolution
```solidity
function resolvePolicy(
    uint256 policyId,
    FlightOracleAdapter.FlightStatus memory flightStatus
) external onlyRole(ORACLE_ROLE) whenNotPaused
```

**What it does:**
- Checks if policy exists and is active
- Uses oracle adapter to determine if policy should trigger
- If triggered: transfers payout from payout vault to policyholder
- Updates policy status (Claimed or Expired)
- Emits `PolicyResolved` event

**Requirements:**
- Only callable by ORACLE_ROLE
- Policy must exist and be active
- Valid flight status data

### ⚙️ **Configuration Functions**

#### Platform Fee Management
```solidity
function setPlatformFee(uint256 _platformFeeBps) external onlyRole(ADMIN_ROLE)
function setFeeRecipient(address _feeRecipient) external onlyRole(ADMIN_ROLE)
```

- **Platform Fee**: Percentage of premium (max 10%)
- **Fee Recipient**: Address that receives platform fees

#### Emergency Controls
```solidity
function pause() external onlyRole(ADMIN_ROLE)
function unpause() external onlyRole(ADMIN_ROLE)
```

- **Pause**: Stops all policy operations
- **Unpause**: Resumes normal operations

### 💰 **Fee Structure**

#### Platform Fee Calculation
```
Platform Fee = (Premium Amount × Platform Fee BPS) / 10,000
Net Premium = Premium Amount - Platform Fee
```

**Example:**
- Premium: 100 USDC
- Platform Fee: 5% (500 basis points)
- Platform Fee Amount: 5 USDC
- Net Premium: 95 USDC

---

## 2. PolicyRegistry Contract

### 📋 **Overview**

The `PolicyRegistry` contract serves as the central database for all flight insurance policies. It stores policy data, manages policy lifecycle, and provides querying capabilities for the insurance system.

### 🎯 **Purpose**

- **Data Storage**: Centralized storage for all insurance policies
- **Policy Management**: Create, update, and track policy status
- **Query Interface**: Provide access to policy data and statistics
- **Lifecycle Tracking**: Monitor policy states from creation to resolution

### 📊 **Core Data Structures**

#### Policy Status Enum
```solidity
enum PolicyStatus {
    Active,      // Policy is active and can be triggered
    Claimed,     // Policy was triggered and payout was made
    Expired,     // Policy expired without being triggered
    Cancelled    // Policy was cancelled (refund scenario)
}
```

#### Policy Struct
```solidity
struct Policy {
    uint256 policyId;                // Unique policy identifier
    address policyholder;            // Address of policy owner
    string flightNumber;             // e.g., "AA123"
    string airline;                  // e.g., "American Airlines"
    uint256 departureTime;           // Unix timestamp
    string departureAirport;         // e.g., "JFK"
    string arrivalAirport;           // e.g., "LAX"
    uint256 premiumAmount;           // USDC amount paid
    uint256 payoutAmount;            // USDC amount to be paid
    uint256 delayThresholdMinutes;   // Delay threshold in minutes
    bool coversCancellation;         // Whether covers cancellation
    PolicyStatus status;             // Current policy status
    uint256 createdAt;               // Creation timestamp
    uint256 updatedAt;               // Last update timestamp
}
```

### 🔧 **Key Functions**

#### Policy Creation
```solidity
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
) external onlyRole(INSURANCE_ROLE) returns (uint256)
```

**What it does:**
- Creates new policy with unique ID
- Stores policy data in mappings
- Updates user and flight policy lists
- Increments total policy count
- Emits `PolicyCreated` event

#### Policy Retrieval
```solidity
function getPolicy(uint256 policyId) external view returns (Policy memory)
function policyExists(uint256 policyId) public view returns (bool)
```

**What it does:**
- Returns complete policy data
- Checks if policy exists
- Used by other contracts for policy validation

#### Policy Status Management
```solidity
function updatePolicyStatus(
    uint256 policyId,
    PolicyStatus newStatus
) external onlyRole(INSURANCE_ROLE)
```

**What it does:**
- Updates policy status
- Validates status transitions
- Updates timestamp
- Emits `PolicyStatusUpdated` event

**Valid Transitions:**
- Active → Claimed (policy triggered)
- Active → Expired (policy not triggered)
- Active → Cancelled (refund scenario)

### 🔄 **Policy Lifecycle**

```
1. CREATE → Active
   ├── User purchases policy
   ├── Policy created with Active status
   └── Stored in registry

2. Active → Claimed
   ├── Flight delay/cancellation occurs
   ├── Policy conditions met
   ├── Payout distributed
   └── Status updated to Claimed

3. Active → Expired
   ├── Flight completes on time
   ├── No payout conditions met
   └── Status updated to Expired

4. Active → Cancelled
   ├── Refund scenario
   ├── Policy cancelled by admin
   └── Status updated to Cancelled
```

---

## 3. PremiumVault Contract

### 📋 **Overview**

The `PremiumVault` contract manages the collection and storage of insurance premiums. It handles USDC transfers, maintains reserve ratios, and provides fund management capabilities for the insurance system.

### 🎯 **Purpose**

- **Premium Collection**: Receives and stores USDC premium payments
- **Reserve Management**: Maintains reserve ratios for system stability
- **Fund Allocation**: Manages premium distribution and reserves
- **Payout Support**: Transfers funds to payout vault when needed

### 📊 **Core Data Structures**

#### Reserve Management
```solidity
uint256 public reserveRatioBps;        // Reserve ratio in basis points (10000 = 100%)
uint256 public constant BASIS_POINTS;  // 10,000 for percentage calculations
uint256 public totalPremiums;          // Total premiums received
uint256 public totalReserves;          // Total reserves allocated
uint256 public totalPayouts;           // Total payouts made
```

### 🔧 **Key Functions**

#### Premium Collection
```solidity
function receivePremium(address from, uint256 amount) external onlyRole(INSURANCE_ROLE) whenNotPaused
```

**What it does:**
- Transfers USDC from sender to vault
- Updates total premiums counter
- Calculates and allocates reserves
- Emits `PremiumReceived` and `ReserveAllocated` events

**Reserve Calculation:**
```
Reserve Amount = (Premium Amount × Reserve Ratio) / 10,000
```

#### Fund Transfers
```solidity
function transferTo(address to, uint256 amount) external onlyRole(INSURANCE_ROLE) whenNotPaused returns (bool)
```

**What it does:**
- Transfers USDC to specified address
- Updates total payouts counter
- Emits `PayoutTransferred` event
- Returns success status

### 💰 **Reserve Management**

#### Reserve Calculation
```
Reserve Amount = (Premium Amount × Reserve Ratio BPS) / 10,000
Available for Payout = Total Balance - Total Reserves
```

#### Example Reserve Scenarios

**Scenario 1: 50% Reserve Ratio**
- Premium: 100 USDC
- Reserve: 50 USDC
- Available: 50 USDC

**Scenario 2: 75% Reserve Ratio**
- Premium: 100 USDC
- Reserve: 75 USDC
- Available: 25 USDC

---

## 4. PayoutVault Contract

### 📋 **Overview**

The `PayoutVault` contract manages the distribution of insurance payouts to policyholders. It includes safety mechanisms like daily limits and maximum payout amounts to prevent excessive payouts and ensure system stability.

### 🎯 **Purpose**

- **Payout Distribution**: Sends USDC payouts to policyholders
- **Safety Limits**: Implements daily and per-transaction limits
- **Fund Management**: Handles deposit and withdrawal operations
- **Risk Control**: Prevents excessive payouts through various safeguards

### 📊 **Core Data Structures**

#### Safety Limits
```solidity
uint256 public maxPayoutAmount;        // Maximum payout per transaction
uint256 public dailyPayoutLimit;       // Maximum daily payout limit
uint256 public dailyPayoutUsed;        // Payouts used today
uint256 public lastResetDay;           // Last day counter was reset
```

#### Statistics
```solidity
uint256 public totalPayouts;           // Total payouts made
uint256 public totalDeposits;          // Total deposits received
uint256 public totalWithdrawals;       // Total withdrawals made
```

### 🔧 **Key Functions**

#### Payout Distribution
```solidity
function transferTo(address to, uint256 amount) external onlyRole(INSURANCE_ROLE) whenNotPaused returns (bool)
```

**What it does:**
- Transfers USDC to policyholder
- Validates safety limits
- Updates daily usage counter
- Emits `PayoutTransferred` event

**Safety Checks:**
- Amount > 0
- Valid recipient address
- Amount ≤ maxPayoutAmount
- Sufficient vault balance
- Daily limit not exceeded

### 🛡️ **Safety Mechanisms**

#### Daily Limit System
```
Daily Limit Check:
1. Calculate current day (block.timestamp / 1 days)
2. If new day: reset dailyPayoutUsed to 0
3. Check: dailyPayoutUsed + amount ≤ dailyPayoutLimit
4. If valid: proceed with payout
5. Update dailyPayoutUsed += amount
```

#### Maximum Payout Check
```
Per-Transaction Limit:
1. Check: amount ≤ maxPayoutAmount
2. If valid: proceed with payout
3. If invalid: revert with error
```

---

## 5. FlightOracleAdapter Contract

### 📋 **Overview**

The `FlightOracleAdapter` contract processes flight status data from external oracles and determines when insurance policies should be triggered. It acts as the bridge between real-world flight data and the insurance system.

### 🎯 **Purpose**

- **Flight Data Processing**: Receives and validates flight status updates
- **Policy Trigger Logic**: Determines if policies should be triggered
- **Data Validation**: Ensures flight data is accurate and timely
- **Policy Monitoring**: Automatically checks policies when flight status changes

### 📊 **Core Data Structures**

#### Flight Status
```solidity
struct FlightStatus {
    string flightNumber;             // e.g., "AA123"
    string airline;                  // e.g., "American Airlines"
    uint256 scheduledDeparture;      // Unix timestamp
    uint256 actualDeparture;         // Unix timestamp
    uint256 scheduledArrival;        // Unix timestamp
    uint256 actualArrival;           // Unix timestamp
    bool isCancelled;                // Flight cancelled flag
    bool isDelayed;                  // Flight delayed flag
    uint256 delayMinutes;            // Delay duration in minutes
    string status;                   // "on-time", "delayed", "cancelled", etc.
    uint256 timestamp;               // Data timestamp
    string departureAirport;         // e.g., "JFK"
    string arrivalAirport;           // e.g., "LAX"
}
```

#### Oracle Data
```solidity
struct OracleData {
    address oracle;                  // Oracle address that provided data
    uint256 timestamp;               // When data was received
    bool isValid;                    // Whether data is still valid
}
```

### 🔧 **Key Functions**

#### Flight Status Updates
```solidity
function updateFlightStatus(FlightStatus memory status) external onlyRole(ORACLE_ROLE) whenNotPaused
```

**What it does:**
- Validates flight status data
- Stores flight status information
- Records oracle data for validation
- Automatically checks policies for this flight
- Emits `FlightStatusUpdated` event

**Validation Checks:**
- Flight number not empty
- Valid timestamp (not future)
- Delay within maximum threshold
- Data integrity checks

#### Policy Trigger Checking
```solidity
function checkPolicyTrigger(
    PolicyRegistry.Policy memory policy,
    FlightStatus memory status
) external view returns (bool)
```

**What it does:**
- Checks if policy should be triggered
- Compares policy conditions with flight status
- Returns true if policy should trigger

**Trigger Conditions:**
- Flight numbers match
- Airports match
- Cancellation coverage and flight cancelled
- Delay coverage and delay exceeds threshold

### 🔄 **Policy Checking Logic**

#### Policy Trigger Conditions
```solidity
function _checkPolicyTrigger(
    PolicyRegistry.Policy memory policy,
    FlightStatus memory status
) internal pure returns (bool)
```

**Trigger Conditions:**
1. **Flight Number Match**: `policy.flightNumber == status.flightNumber`
2. **Airport Match**: `policy.departureAirport == status.departureAirport`
3. **Airport Match**: `policy.arrivalAirport == status.arrivalAirport`
4. **Cancellation**: `policy.coversCancellation && status.isCancelled`
5. **Delay**: `status.isDelayed && status.delayMinutes >= policy.delayThresholdMinutes`

---

## 🚀 **Getting Started**

### 1. Deploy Contracts
Deploy all contracts using proxy pattern with proper initialization.

### 2. Setup Roles
Configure role-based access control for different functions.

### 3. Fund Vaults
Deposit initial funds to payout vault for policy coverage.

### 4. Configure Parameters
Set platform fees, reserve ratios, and safety limits.

### 5. Start Operations
Begin accepting policy purchases and processing payouts.

## 🧪 **Testing**

Use the provided test files to verify contract functionality:
- Policy purchase and resolution
- Flight delay and cancellation scenarios
- Access control and permissions
- Emergency functions

## 📈 **Monitoring**

Track system health through:
- Policy statistics
- Vault balances
- Payout metrics
- Oracle data validity
- Daily limits and usage

## ⚠️ **Important Notes**

1. **USDC Approval**: Users must approve USDC spending before purchasing policies
2. **Oracle Role**: Only addresses with ORACLE_ROLE can resolve policies
3. **Time Validation**: Departure time must be in the future
4. **Fee Calculation**: Platform fees are deducted from premium amount
5. **Payout Trigger**: Policies only trigger if flight conditions are met
6. **Upgrade Safety**: Only admin can authorize contract upgrades
7. **Safety Limits**: Daily and per-transaction limits prevent excessive payouts
8. **Data Validity**: Flight data expires after validity period
9. **Reserve Management**: Reserve ratios ensure system stability
10. **Emergency Controls**: All contracts support pause functionality
