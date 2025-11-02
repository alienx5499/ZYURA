# Assignment 3: Architecture Design (ZYURA)
**Solana Protocol Architecture Diagram Construction**

---

## Part A: Program Structure Visualization

### 1. Core Program Architecture

The ZYURA protocol consists of a single Anchor program (`zyura`) that manages all insurance operations through modular instruction handlers.

```mermaid
graph TB
    subgraph "ZYURA Program"
        ZP["<b>ZYURA Program</b><br/>H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX"]
        
        subgraph "Instruction Modules"
            INIT["<b>Initialize</b>"]
            PROD["<b>Product Management</b>"]
            POLICY["<b>Policy Operations</b>"]
            LIQ["<b>Liquidity Management</b>"]
            ADMIN["<b>Admin Controls</b>"]
        end
        
        ZP --> INIT
        ZP --> PROD
        ZP --> POLICY
        ZP --> LIQ
        ZP --> ADMIN
    end
    
    subgraph "External Programs"
        SPL["<b>SPL Token Program</b>"]
        ATA["<b>Associated Token Program</b>"]
        SYS["<b>System Program</b>"]
        META["<b>Metaplex Token Metadata</b>"]
        SWB["<b>Switchboard Oracle</b>"]
    end
    
    ZP -.CPI.-> SPL
    ZP -.CPI.-> ATA
    ZP -.CPI.-> SYS
    ZP -.CPI.-> META
    ZP -.Reads.-> SWB
    
    style ZP fill:#667eea,stroke:#4c51bf,stroke-width:4px,color:#fff
    style INIT fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style PROD fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style POLICY fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style LIQ fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style ADMIN fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style SPL fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style ATA fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style SYS fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style META fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style SWB fill:#fbbf24,stroke:#f59e0b,stroke-width:3px,color:#1a202c
```

### 2. Instruction Flow Diagram

```mermaid
flowchart TD
    START([User Action]) --> CHECK{Action Type}
    
    CHECK -->|Initialize| INIT_FLOW[Initialize Protocol]
    CHECK -->|Admin| ADMIN_FLOW[Admin Operations]
    CHECK -->|Purchase| PURCHASE_FLOW[Purchase Policy]
    CHECK -->|Payout| PAYOUT_FLOW[Process Payout]
    CHECK -->|Liquidity| LIQ_FLOW[Liquidity Operations]
    
    INIT_FLOW --> INIT_ACCOUNTS[Create Config PDA]
    INIT_ACCOUNTS --> DONE1([Protocol Ready])
    
    ADMIN_FLOW --> ADMIN_CHECK{Admin Authorized?}
    ADMIN_CHECK -->|Yes| PROD_MGMT[Create/Update Product]
    ADMIN_CHECK -->|Yes| PAUSE[Pause/Resume Protocol]
    ADMIN_CHECK -->|No| ERROR1([Error: Unauthorized])
    PROD_MGMT --> DONE2([Product Updated])
    PAUSE --> DONE3([Protocol Paused/Resumed])
    
    PURCHASE_FLOW --> CHECK_PAUSE{Protocol Paused?}
    CHECK_PAUSE -->|Yes| ERROR2([Error: Protocol Paused])
    CHECK_PAUSE -->|No| CHECK_PRODUCT{Product Active?}
    CHECK_PRODUCT -->|No| ERROR3([Error: Product Inactive])
    CHECK_PRODUCT -->|Yes| TRANSFER_PREM[Transfer Premium to Vault]
    TRANSFER_PREM --> CREATE_POLICY[Create Policy PDA]
    CREATE_POLICY --> MINT_NFT[Mint Policy NFT]
    MINT_NFT --> FREEZE_NFT[Freeze NFT Account]
    FREEZE_NFT --> DONE4([Policy Active])
    
    PAYOUT_FLOW --> VERIFY_ADMIN{Admin Signature?}
    VERIFY_ADMIN -->|No| ERROR4([Error: Unauthorized])
    VERIFY_ADMIN -->|Yes| CHECK_STATUS{Policy Active?}
    CHECK_STATUS -->|No| ERROR5([Error: Policy Not Active])
    CHECK_STATUS -->|Yes| VERIFY_DELAY{Delay >= Threshold?}
    VERIFY_DELAY -->|No| ERROR6([Error: Threshold Not Met])
    VERIFY_DELAY -->|Yes| TRANSFER_PAYOUT[Transfer Coverage Amount]
    TRANSFER_PAYOUT --> UPDATE_STATUS[Update Policy Status]
    UPDATE_STATUS --> DONE5([Payout Complete])
    
    LIQ_FLOW --> LIQ_TYPE{Operation Type}
    LIQ_TYPE -->|Deposit| DEPOSIT[Transfer to Vault]
    LIQ_TYPE -->|Withdraw| WITHDRAW_CHECK{Admin Auth?}
    DEPOSIT --> UPDATE_LP[Update LP Account]
    UPDATE_LP --> DONE6([Deposit Complete])
    WITHDRAW_CHECK -->|No| ERROR7([Error: Unauthorized])
    WITHDRAW_CHECK -->|Yes| WITHDRAW[Transfer from Vault]
    WITHDRAW --> UPDATE_LP2[Update LP Account]
    UPDATE_LP2 --> DONE7([Withdrawal Complete])
    
    style START fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style CHECK fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style INIT_FLOW fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style ADMIN_FLOW fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style PURCHASE_FLOW fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style PAYOUT_FLOW fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style LIQ_FLOW fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style DONE1 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE2 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE3 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE4 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE5 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE6 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE7 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ERROR1 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR2 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR3 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR4 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR5 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR6 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR7 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style CHECK_PAUSE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PRODUCT fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ADMIN_CHECK fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style VERIFY_ADMIN fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_STATUS fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style VERIFY_DELAY fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style LIQ_TYPE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style WITHDRAW_CHECK fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
```

---

## Part B: Account Structure Mapping

### 1. Account Hierarchy and Ownership

```mermaid
graph TB
    subgraph "Program-Derived Addresses (PDAs)"
        CONFIG["<b>Config PDA</b><br/>seeds: ['config']<br/>Owner: ZYURA Program"]
        
        PROD1["<b>Product PDA #1</b><br/>seeds: ['product', product_id]<br/>Owner: ZYURA Program"]
        PROD2["<b>Product PDA #2</b><br/>seeds: ['product', product_id]<br/>Owner: ZYURA Program"]
        
        POLICY1["<b>Policy PDA #1</b><br/>seeds: ['policy', policy_id]<br/>Owner: ZYURA Program"]
        POLICY2["<b>Policy PDA #N</b><br/>seeds: ['policy', policy_id]<br/>Owner: ZYURA Program"]
        
        LP1["<b>LP PDA #1</b><br/>seeds: ['liquidity_provider', user_pubkey]<br/>Owner: ZYURA Program"]
        LPN["<b>LP PDA #N</b><br/>seeds: ['liquidity_provider', user_pubkey]<br/>Owner: ZYURA Program"]
        
        MINT_AUTH["<b>Mint Authority PDA</b><br/>seeds: ['policy_mint_authority']<br/>Owner: ZYURA Program"]
    end
    
    subgraph "Token Accounts"
        VAULT["<b>Risk Pool Vault</b><br/>Token Account<br/>Owner: Config PDA"]
        
        USER1_USDC["<b>User USDC Account</b><br/>Token Account<br/>Owner: User Wallet"]
        USER2_USDC["<b>User USDC Account</b><br/>Token Account<br/>Owner: User Wallet"]
        
        USER1_NFT["<b>Policy NFT ATA</b><br/>Token Account<br/>Owner: User Wallet<br/>Frozen: Yes"]
        USER2_NFT["<b>Policy NFT ATA</b><br/>Token Account<br/>Owner: User Wallet<br/>Frozen: Yes"]
    end
    
    subgraph "NFT Mint Accounts"
        NFT_MINT1["<b>Policy NFT Mint #1</b><br/>Mint Account<br/>Supply: 1<br/>Authority: Mint Authority PDA"]
        NFT_MINT2["<b>Policy NFT Mint #N</b><br/>Mint Account<br/>Supply: 1<br/>Authority: Mint Authority PDA"]
    end
    
    subgraph "Metadata Accounts (Metaplex)"
        METADATA1["<b>Metadata PDA #1</b><br/>seeds: ['metadata', Metaplex, mint]<br/>Owner: Token Metadata Program"]
        METADATA2["<b>Metadata PDA #N</b><br/>seeds: ['metadata', Metaplex, mint]<br/>Owner: Token Metadata Program"]
        
        MASTER1["<b>Master Edition #1</b><br/>seeds: ['metadata', Metaplex, mint, 'edition']<br/>Owner: Token Metadata Program"]
        MASTER2["<b>Master Edition #N</b><br/>seeds: ['metadata', Metaplex, mint, 'edition']<br/>Owner: Token Metadata Program"]
    end
    
    CONFIG --> PROD1
    CONFIG --> PROD2
    CONFIG --> VAULT
    
    PROD1 -.references.-> POLICY1
    PROD2 -.references.-> POLICY2
    
    POLICY1 --> NFT_MINT1
    POLICY2 --> NFT_MINT2
    
    NFT_MINT1 --> USER1_NFT
    NFT_MINT2 --> USER2_NFT
    
    NFT_MINT1 --> METADATA1
    NFT_MINT2 --> METADATA2
    
    METADATA1 --> MASTER1
    METADATA2 --> MASTER2
    
    MINT_AUTH -.authority.-> NFT_MINT1
    MINT_AUTH -.authority.-> NFT_MINT2
    
    USER1_USDC -.transfers.-> VAULT
    USER2_USDC -.transfers.-> VAULT
    
    LP1 -.tracks.-> VAULT
    LPN -.tracks.-> VAULT
    
    style CONFIG fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style PROD1 fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style PROD2 fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style POLICY1 fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style POLICY2 fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style VAULT fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style NFT_MINT1 fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style NFT_MINT2 fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style LP1 fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style LPN fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style MINT_AUTH fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style USER1_USDC fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style USER2_USDC fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style USER1_NFT fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style USER2_NFT fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style METADATA1 fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style METADATA2 fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style MASTER1 fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    style MASTER2 fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
```

### 2. Account Data Structures

```mermaid
classDiagram
    class Config {
        +Pubkey admin
        +Pubkey usdc_mint
        +Pubkey switchboard_program
        +bool paused
        +u8 bump
    }
    
    class Product {
        +u64 id
        +u32 delay_threshold_minutes
        +u64 coverage_amount
        +u16 premium_rate_bps
        +u32 claim_window_hours
        +bool active
        +u8 bump
    }
    
    class Policy {
        +u64 id
        +Pubkey policyholder
        +u64 product_id
        +String flight_number
        +i64 departure_time
        +u64 premium_paid
        +u64 coverage_amount
        +PolicyStatus status
        +i64 created_at
        +Option~i64~ paid_at
        +u8 bump
    }
    
    class PolicyStatus {
        <<enumeration>>
        Active
        PaidOut
        Expired
    }
    
    class LiquidityProvider {
        +Pubkey provider
        +u64 total_deposited
        +u64 total_withdrawn
        +u64 active_deposit
        +u8 bump
    }
    
    Config --> Product : references
    Product --> Policy : defines parameters
    Policy --> PolicyStatus : has status
    Config --> LiquidityProvider : tracks providers
    
    style Config fill:#667eea,stroke:#4c51bf,color:#fff
    style Product fill:#48bb78,stroke:#2f855a,color:#fff
    style Policy fill:#f59e0b,stroke:#d97706,color:#fff
    style PolicyStatus fill:#fbbf24,stroke:#f59e0b,color:#1a202c
    style LiquidityProvider fill:#38b2ac,stroke:#2c7a7b,color:#fff
```

### 3. PDA Derivation Process

```mermaid
flowchart LR
    subgraph "Config PDA"
        C1["Seed: 'config'"] --> C2["Program ID"] --> C3["<b>Config PDA</b><br/>bump stored in account"]
    end
    
    subgraph "Product PDA"
        P1["Seed: 'product'"] --> P2["Product ID: u64"] --> P3["Program ID"] --> P4["<b>Product PDA</b><br/>bump stored in account"]
    end
    
    subgraph "Policy PDA"
        POL1["Seed: 'policy'"] --> POL2["Policy ID: u64"] --> POL3["Program ID"] --> POL4["<b>Policy PDA</b><br/>bump stored in account"]
    end
    
    subgraph "LP PDA"
        LP1_SEED["Seed: 'liquidity_provider'"] --> LP2["User Pubkey"] --> LP3["Program ID"] --> LP4["<b>LP PDA</b><br/>bump stored in account"]
    end
    
    subgraph "Mint Authority PDA"
        MA1["Seed: 'policy_mint_authority'"] --> MA2["Program ID"] --> MA3["<b>Mint Authority PDA</b><br/>bump stored in account"]
    end
    
    style C1 fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style C2 fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style C3 fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style P1 fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style P2 fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style P3 fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style P4 fill:#48bb78,stroke:#2f855a,stroke-width:3px,color:#fff
    style POL1 fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style POL2 fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style POL3 fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style POL4 fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#fff
    style LP1_SEED fill:#7dd3fc,stroke:#0ea5e9,stroke-width:2px,color:#1a202c
    style LP2 fill:#7dd3fc,stroke:#0ea5e9,stroke-width:2px,color:#1a202c
    style LP3 fill:#7dd3fc,stroke:#0ea5e9,stroke-width:2px,color:#1a202c
    style LP4 fill:#38b2ac,stroke:#2c7a7b,stroke-width:3px,color:#fff
    style MA1 fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    style MA2 fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    style MA3 fill:#9f7aea,stroke:#805ad5,stroke-width:3px,color:#fff
```

---

## Part C: External Dependencies and Integrations

### 1. External System Integration

```mermaid
graph TB
    subgraph "On-Chain Programs"
        ZYURA["<b>ZYURA Program</b>"]
        SPL["<b>SPL Token Program</b>"]
        ATA["<b>Associated Token Program</b>"]
        SYSTEM["<b>System Program</b>"]
        METAPLEX["<b>Metaplex Token Metadata Program</b>"]
    end
    
    subgraph "Oracle Systems"
        SWITCHBOARD["<b>Switchboard Oracle</b><br/>Flight Delay Data"]
    end
    
    subgraph "Frontend/Off-Chain"
        OTA["<b>OTA/Airline Integration</b><br/>Flight Booking Systems"]
        USER_UI["<b>User Interface</b><br/>Wallet Connection"]
        ADMIN_UI["<b>Admin Dashboard</b>"]
    end
    
    subgraph "External Services"
        FLIGHT_API["<b>Flight Status APIs</b><br/>OpenSky, Aviation Edge, etc."]
        OFFCHAIN_AGG["<b>Off-Chain Aggregator</b><br/>Multi-source reconciliation"]
    end
    
    USER_UI -->|"<b>1. Connect Wallet</b>"| ZYURA
    USER_UI -->|"<b>2. Purchase Policy</b>"| ZYURA
    USER_UI -->|"<b>3. View Policies</b>"| ZYURA
    
    OTA -->|"<b>4. Flight Data</b>"| OFFCHAIN_AGG
    OTA -->|"<b>5. Trigger Policy Creation</b>"| USER_UI
    
    OFFCHAIN_AGG -->|"<b>6. Aggregate Data</b>"| FLIGHT_API
    OFFCHAIN_AGG -->|"<b>7. Push to Oracle</b>"| SWITCHBOARD
    
    SWITCHBOARD -->|"<b>8. Oracle Feed</b>"| ZYURA
    ADMIN_UI -->|"<b>9. Verify Delay</b>"| ZYURA
    ADMIN_UI -->|"<b>10. Trigger Payout</b>"| ZYURA
    
    ZYURA -.CPI.-> SPL
    ZYURA -.CPI.-> ATA
    ZYURA -.CPI.-> SYSTEM
    ZYURA -.CPI.-> METAPLEX
    ZYURA -.Reads.-> SWITCHBOARD
    
    style ZYURA fill:#667eea,stroke:#4c51bf,stroke-width:4px,color:#fff
    style SPL fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style ATA fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style SYSTEM fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style METAPLEX fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style SWITCHBOARD fill:#fbbf24,stroke:#f59e0b,stroke-width:4px,color:#1a202c
    style OTA fill:#48bb78,stroke:#2f855a,stroke-width:3px,color:#fff
    style USER_UI fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style ADMIN_UI fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style FLIGHT_API fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style OFFCHAIN_AGG fill:#f97316,stroke:#ea580c,stroke-width:3px,color:#fff
```

### 2. Oracle Data Flow

```mermaid
sequenceDiagram
    participant User as Traveler
    participant OTA as OTA/Airline
    participant Agg as Off-Chain Aggregator
    participant API1 as Flight API 1
    participant API2 as Flight API 2
    participant Oracle as Switchboard Oracle
    participant Program as ZYURA Program
    participant Admin as Admin
    
    User->>OTA: Book Flight
    OTA->>Program: Create Policy (flight details)
    Program->>Program: Store Policy (Active)
    
    Note over API1,API2: Scheduled Checks
    
    Agg->>API1: Query Flight Status
    Agg->>API2: Query Flight Status
    API1-->>Agg: Delay: 45 min
    API2-->>Agg: Delay: 47 min
    
    Agg->>Agg: Reconcile Data
    
    alt Delay Confirmed
        Agg->>Oracle: Push Verified Delay Data
        Oracle->>Oracle: Update Oracle Account
        
        Admin->>Oracle: Read Oracle Account
        Admin->>Program: process_payout()
        Program->>Program: Verify Delay >= Threshold
        Program->>Program: Transfer USDC from Vault
        Program->>Program: Update Policy Status
        Program-->>User: Payout Complete
    else No Delay
        Agg->>Agg: Continue Monitoring
    end
```

---

## Part D: User Interaction Flows

### 1. Complete User Journey: Purchase to Payout

```mermaid
sequenceDiagram
    participant Traveler
    participant OTA as OTA Frontend
    participant Wallet as User Wallet
    participant Program as ZYURA Program
    participant Token as SPL Token Program
    participant Vault as Risk Pool Vault
    participant NFT as NFT Mint
    participant Metadata as Metaplex
    
    Note over Traveler,Metadata: 1. POLICY PURCHASE FLOW
    
    Traveler->>OTA: Select Flight & Insurance
    OTA->>Wallet: Request Transaction
    Wallet->>Program: purchase_policy()
    
    Program->>Program: Check Protocol Status
    Program->>Program: Verify Product Active
    Program->>Program: Calculate Premium
    
    Program->>Token: Transfer USDC (CPI)
    Token->>Wallet: Deduct Premium
    Token->>Vault: Add Premium
    
    Program->>Program: Create Policy PDA
    Program->>Token: Mint NFT (CPI)
    Token->>NFT: Create Mint Account
    Program->>Token: Freeze NFT ATA
    Program->>Metadata: Create Metadata (CPI)
    
    Program-->>Traveler: Policy Active + NFT Minted
    
    Note over Traveler,Metadata: 2. PAYOUT FLOW (After Delay Detected)
    
    Program->>Program: Admin calls process_payout()
    Program->>Program: Verify Admin Authority
    Program->>Program: Check Policy Status
    Program->>Program: Verify Delay >= Threshold
    
    Program->>Token: Transfer Coverage Amount (CPI)
    Token->>Vault: Deduct Coverage
    Token->>Wallet: Add Coverage
    
    Program->>Program: Update Policy Status = PaidOut
    Program-->>Traveler: Payout Complete
```

### 2. Liquidity Provider Flow

```mermaid
flowchart TD
    START([LP Wants to Deposit]) --> CONNECT[Connect Wallet]
    CONNECT --> SELECT{Operation}
    
    SELECT -->|Deposit| DEPOSIT_FLOW[deposit_liquidity Instruction]
    SELECT -->|Withdraw| WITHDRAW_FLOW[withdraw_liquidity Instruction]
    
    DEPOSIT_FLOW --> CHECK_PAUSE1{Protocol Paused?}
    CHECK_PAUSE1 -->|Yes| ERROR1([Error: Protocol Paused])
    CHECK_PAUSE1 -->|No| TRANSFER_IN[Transfer USDC to Vault]
    TRANSFER_IN --> CREATE_LP{LP Account Exists?}
    CREATE_LP -->|No| INIT_LP[Initialize LP PDA]
    CREATE_LP -->|Yes| UPDATE_LP[Update LP Account]
    INIT_LP --> UPDATE_BALANCE["Update: total_deposited += amount<br/>active_deposit += amount"]
    UPDATE_LP --> UPDATE_BALANCE
    UPDATE_BALANCE --> DONE1([Deposit Complete])
    
    WITHDRAW_FLOW --> CHECK_PAUSE2{Protocol Paused?}
    CHECK_PAUSE2 -->|Yes| ERROR2([Error: Protocol Paused])
    CHECK_PAUSE2 -->|No| CHECK_ADMIN{Admin Signature?}
    CHECK_ADMIN -->|No| ERROR3([Error: Unauthorized])
    CHECK_ADMIN -->|Yes| CHECK_BALANCE{active_deposit >= amount?}
    CHECK_BALANCE -->|No| ERROR4([Error: Insufficient Balance])
    CHECK_BALANCE -->|Yes| TRANSFER_OUT[Transfer USDC from Vault]
    TRANSFER_OUT --> UPDATE_WITHDRAW["Update: total_withdrawn += amount<br/>active_deposit -= amount"]
    UPDATE_WITHDRAW --> DONE2([Withdrawal Complete])
    
    style START fill:#38b2ac,stroke:#2c7a7b,stroke-width:3px,color:#fff
    style CONNECT fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style SELECT fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style DEPOSIT_FLOW fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style WITHDRAW_FLOW fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style TRANSFER_IN fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style TRANSFER_OUT fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style INIT_LP fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style UPDATE_LP fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style UPDATE_BALANCE fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style UPDATE_WITHDRAW fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style DONE1 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE2 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ERROR1 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR2 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR3 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR4 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style CHECK_PAUSE1 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PAUSE2 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_ADMIN fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_BALANCE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CREATE_LP fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
```

### 3. Admin Operations Flow

```mermaid
flowchart TD
    ADMIN([Admin]) --> AUTH_CHECK{Verify Admin Signature}
    AUTH_CHECK -->|Invalid| ERROR([Error: Unauthorized])
    AUTH_CHECK -->|Valid| OPERATION{Select Operation}
    
    OPERATION -->|Initialize| INIT[initialize Protocol]
    OPERATION -->|Create Product| CREATE[create_product]
    OPERATION -->|Update Product| UPDATE[update_product]
    OPERATION -->|Pause/Resume| PAUSE[set_pause_status]
    OPERATION -->|Process Payout| PAYOUT[process_payout]
    OPERATION -->|Allow Withdrawal| WITHDRAW[withdraw_liquidity]
    
    INIT --> CREATE_CONFIG[Create Config PDA<br/>- Set admin<br/>- Set USDC mint<br/>- Set Switchboard program<br/>- Initialize paused = false]
    CREATE_CONFIG --> DONE1([Protocol Initialized])
    
    CREATE --> CHECK_PAUSE1{Protocol Paused?}
    CHECK_PAUSE1 -->|Yes| ERROR
    CHECK_PAUSE1 -->|No| CREATE_PDA[Create Product PDA<br/>- Set parameters<br/>- Set active = true]
    CREATE_PDA --> DONE2([Product Created])
    
    UPDATE --> CHECK_PAUSE2{Protocol Paused?}
    CHECK_PAUSE2 -->|Yes| ERROR
    CHECK_PAUSE2 -->|No| UPDATE_PARAMS[Update Product Parameters<br/>- delay_threshold_minutes<br/>- coverage_amount<br/>- premium_rate_bps<br/>- claim_window_hours]
    UPDATE_PARAMS --> DONE3([Product Updated])
    
    PAUSE --> TOGGLE[Set paused flag]
    TOGGLE --> DONE4([Protocol Paused/Resumed])
    
    PAYOUT --> VERIFY_DELAY{Delay >= Threshold?}
    VERIFY_DELAY -->|No| ERROR5([Error: Threshold Not Met])
    VERIFY_DELAY -->|Yes| TRANSFER[Transfer Coverage Amount]
    TRANSFER --> UPDATE_POLICY[Update Policy Status = PaidOut]
    UPDATE_POLICY --> DONE5([Payout Processed])
    
    WITHDRAW --> CHECK_BALANCE{LP Balance >= Amount?}
    CHECK_BALANCE -->|No| ERROR6([Error: Insufficient Balance])
    CHECK_BALANCE -->|Yes| TRANSFER_OUT[Transfer USDC from Vault]
    TRANSFER_OUT --> UPDATE_LP[Update LP Account]
    UPDATE_LP --> DONE6([Withdrawal Allowed])
    
    style ADMIN fill:#9f7aea,stroke:#805ad5,stroke-width:3px,color:#fff
    style AUTH_CHECK fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style OPERATION fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style INIT fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style CREATE fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style UPDATE fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style PAUSE fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style PAYOUT fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style WITHDRAW fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style CREATE_CONFIG fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style CREATE_PDA fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style UPDATE_PARAMS fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style TOGGLE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style TRANSFER fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style TRANSFER_OUT fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style UPDATE_POLICY fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style UPDATE_LP fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style DONE1 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE2 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE3 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE4 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE5 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE6 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ERROR fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR5 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR6 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style CHECK_PAUSE1 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PAUSE2 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style VERIFY_DELAY fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_BALANCE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
```

---

## Part E: Program Interaction Matrix

### 1. Cross-Program Invocations (CPIs)

```mermaid
graph LR
    subgraph "ZYURA Program"
        ZP["<b>ZYURA Program</b>"]
    end
    
    subgraph "SPL Token Program"
        SPL["<b>Token Program</b>"]
        TRANSFER["<b>Transfer Instruction</b>"]
        MINT["<b>MintTo Instruction</b>"]
        FREEZE["<b>FreezeAccount Instruction</b>"]
    end
    
    subgraph "Associated Token Program"
        ATA["<b>ATA Program</b>"]
        CREATE_ATA["<b>Create Instruction</b>"]
    end
    
    subgraph "System Program"
        SYSTEM["<b>System Program</b>"]
        CREATE_ACCOUNT["<b>Create Account</b>"]
    end
    
    subgraph "Metaplex Token Metadata"
        META["<b>Token Metadata Program</b>"]
        CREATE_META["<b>CreateMetadataAccountV3</b>"]
        CREATE_EDITION["<b>CreateMasterEditionV3</b>"]
    end
    
    ZP -->|"<b>purchase_policy</b>"| TRANSFER
    ZP -->|"<b>purchase_policy</b>"| MINT
    ZP -->|"<b>purchase_policy</b>"| FREEZE
    ZP -->|"<b>purchase_policy</b>"| CREATE_META
    ZP -->|"<b>purchase_policy</b>"| CREATE_EDITION
    ZP -->|"<b>process_payout</b>"| TRANSFER
    ZP -->|"<b>deposit_liquidity</b>"| TRANSFER
    ZP -->|"<b>withdraw_liquidity</b>"| TRANSFER
    ZP -->|"<b>purchase_policy</b>"| CREATE_ATA
    
    TRANSFER -.CPI.-> SPL
    MINT -.CPI.-> SPL
    FREEZE -.CPI.-> SPL
    CREATE_ATA -.CPI.-> ATA
    CREATE_META -.CPI.-> META
    CREATE_EDITION -.CPI.-> META
    
    style ZP fill:#667eea,stroke:#4c51bf,stroke-width:4px,color:#fff
    style SPL fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style TRANSFER fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style MINT fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style FREEZE fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style ATA fill:#fc8181,stroke:#e53e3e,stroke-width:3px,color:#fff
    style CREATE_ATA fill:#fca5a5,stroke:#ef4444,stroke-width:2px,color:#fff
    style SYSTEM fill:#68d391,stroke:#38a169,stroke-width:3px,color:#1a202c
    style CREATE_ACCOUNT fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#1a202c
    style META fill:#b794f4,stroke:#9f7aea,stroke-width:3px,color:#fff
    style CREATE_META fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    style CREATE_EDITION fill:#ddb3ff,stroke:#c084fc,stroke-width:2px,color:#fff
```

### 2. Instruction-to-Program Mapping

| ZYURA Instruction | CPI Target Program | CPI Instruction | Purpose |
|------------------|-------------------|------------------|---------|
| `purchase_policy` | SPL Token | `transfer` | Transfer premium to vault |
| `purchase_policy` | SPL Token | `mint_to` | Mint policy NFT |
| `purchase_policy` | SPL Token | `freeze_account` | Freeze NFT account (soulbound) |
| `purchase_policy` | Associated Token | `create` | Create NFT ATA |
| `purchase_policy` | Metaplex | `CreateMetadataAccountV3` | Create NFT metadata |
| `purchase_policy` | Metaplex | `CreateMasterEditionV3` | Create NFT master edition |
| `process_payout` | SPL Token | `transfer` | Transfer coverage from vault |
| `deposit_liquidity` | SPL Token | `transfer` | Transfer USDC to vault |
| `withdraw_liquidity` | SPL Token | `transfer` | Transfer USDC from vault |

### 3. Data Flow Between Accounts

```mermaid
graph TD
    subgraph "Policy Purchase Flow"
        USER_WALLET[User Wallet] -->|Premium USDC| VAULT[Risk Pool Vault]
        USER_WALLET -->|Create Policy PDA| POLICY_PDA[Policy Account]
        POLICY_PDA -->|Reference| PRODUCT_PDA[Product Account]
        POLICY_PDA -->|Mint NFT| NFT_MINT[NFT Mint Account]
        NFT_MINT -->|Transfer to User| USER_NFT[User NFT ATA]
        NFT_MINT -->|Create Metadata| METADATA[Metaplex Metadata]
    end
    
    subgraph "Payout Flow"
        ADMIN[Admin] -->|Trigger| POLICY_PDA2[Policy Account]
        POLICY_PDA2 -->|Verify Delay| PRODUCT_PDA2[Product Account]
        VAULT2[Risk Pool Vault] -->|Transfer Coverage| USER_WALLET2[User Wallet]
        POLICY_PDA2 -->|Update Status| STATUS[PolicyStatus = PaidOut]
    end
    
    subgraph "Liquidity Flow"
        LP_WALLET[LP Wallet] -->|Deposit USDC| VAULT3[Risk Pool Vault]
        LP_WALLET -->|Update| LP_PDA[LP Account]
        LP_PDA -->|Track| BALANCE[active_deposit]
        
        ADMIN2[Admin] -->|Approve Withdrawal| LP_PDA2[LP Account]
        VAULT4[Risk Pool Vault] -->|Withdraw USDC| LP_WALLET2[LP Wallet]
        LP_PDA2 -->|Update| BALANCE2[active_deposit]
    end
    
    style USER_WALLET fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style USER_WALLET2 fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style VAULT fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style VAULT2 fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style VAULT3 fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style VAULT4 fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style POLICY_PDA fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style POLICY_PDA2 fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style PRODUCT_PDA fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style PRODUCT_PDA2 fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style NFT_MINT fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style USER_NFT fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style METADATA fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style ADMIN fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style ADMIN2 fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style STATUS fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style LP_WALLET fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style LP_WALLET2 fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style LP_PDA fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style LP_PDA2 fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style BALANCE fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style BALANCE2 fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
```

---

## Part F: Account Management Details

### 1. Account Creation Flow

```mermaid
flowchart TD
    START([Instruction Called]) --> INIT{Account Type}
    
    INIT -->|Config| CONFIG_FLOW[Initialize Config PDA]
    INIT -->|Product| PRODUCT_FLOW[Initialize Product PDA]
    INIT -->|Policy| POLICY_FLOW[Initialize Policy PDA]
    INIT -->|LP| LP_FLOW[Initialize LP PDA]
    INIT -->|NFT Mint| NFT_FLOW[Initialize NFT Mint]
    
    CONFIG_FLOW --> CONFIG_SEED[Seeds: 'config']
    CONFIG_SEED --> CONFIG_PDA[Create PDA<br/>Store: admin, usdc_mint,<br/>switchboard_program, paused, bump]
    CONFIG_PDA --> DONE1([Config Created])
    
    PRODUCT_FLOW --> PROD_SEED[Seeds: 'product', product_id]
    PROD_SEED --> PROD_PDA[Create PDA<br/>Store: id, thresholds,<br/>coverage, rates, active, bump]
    PROD_PDA --> DONE2([Product Created])
    
    POLICY_FLOW --> POL_SEED[Seeds: 'policy', policy_id]
    POL_SEED --> POL_PDA[Create PDA<br/>Store: id, policyholder,<br/>flight details, status, bump]
    POL_PDA --> MINT_NFT_FLOW[Mint NFT]
    POL_PDA --> DONE3([Policy Created])
    
    LP_FLOW --> LP_SEED[Seeds: 'liquidity_provider', user_pubkey]
    LP_SEED --> LP_PDA[Create PDA<br/>Store: provider, deposits,<br/>withdrawals, active_deposit, bump]
    LP_PDA --> DONE4([LP Account Created])
    
    NFT_FLOW --> NFT_CREATE[Create Mint Account<br/>Decimals: 0<br/>Authority: Mint Authority PDA]
    NFT_CREATE --> NFT_ATA[Create ATA for User]
    NFT_ATA --> NFT_MINT[Mint 1 Token]
    NFT_MINT --> NFT_FREEZE[Freeze ATA Account]
    NFT_FREEZE --> NFT_META[Create Metadata via Metaplex CPI]
    NFT_META --> DONE5([NFT Created])
    
    MINT_NFT_FLOW --> NFT_FLOW
    
    style START fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style INIT fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style CONFIG_FLOW fill:#4299e1,stroke:#2b6cb0,stroke-width:2px,color:#fff
    style CONFIG_SEED fill:#7dd3fc,stroke:#0ea5e9,stroke-width:2px,color:#1a202c
    style CONFIG_PDA fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style PRODUCT_FLOW fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style PROD_SEED fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
    style PROD_PDA fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style POLICY_FLOW fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style POL_SEED fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style POL_PDA fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style LP_FLOW fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style LP_SEED fill:#7dd3fc,stroke:#0ea5e9,stroke-width:2px,color:#1a202c
    style LP_PDA fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style NFT_FLOW fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style NFT_CREATE fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    style NFT_ATA fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style NFT_MINT fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style NFT_FREEZE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style NFT_META fill:#ddb3ff,stroke:#c084fc,stroke-width:2px,color:#fff
    style MINT_NFT_FLOW fill:#ed8936,stroke:#c05621,stroke-width:2px,color:#fff
    style DONE1 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE2 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE3 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE4 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style DONE5 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
```

### 2. Account State Transitions

```mermaid
stateDiagram-v2
    [*] --> Uninitialized
    
    Uninitialized --> ConfigInitialized: initialize()
    
    ConfigInitialized --> ProductActive: create_product()
    ConfigInitialized --> ProtocolPaused: set_pause_status(true)
    
    ProductActive --> ProductUpdated: update_product()
    ProductActive --> PolicyActive: purchase_policy()
    
    ProtocolPaused --> ProductActive: set_pause_status(false)
    
    PolicyActive --> PolicyPaidOut: process_payout()
    PolicyActive --> PolicyExpired: Time > claim_window
    
    PolicyPaidOut --> [*]
    PolicyExpired --> [*]
    
    note right of ConfigInitialized
        Stores:
        - admin
        - usdc_mint
        - switchboard_program
        - paused flag
    end note
    
    note right of ProductActive
        Stores:
        - delay_threshold_minutes
        - coverage_amount
        - premium_rate_bps
        - claim_window_hours
    end note
    
    note right of PolicyActive
        Stores:
        - policyholder
        - flight_number
        - departure_time
        - premium_paid
        - coverage_amount
        - status: Active
    end note
    
    note right of PolicyPaidOut
        Updated:
        - status: PaidOut
        - paid_at: timestamp
    end note
```

### 3. Ownership Model

```mermaid
graph TB
    subgraph "Program Ownership"
        ZYURA_PROG["<b>ZYURA Program</b><br/>ID: H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX"]
    end
    
    subgraph "PDA Accounts (Owned by ZYURA)"
        CONFIG["<b>Config PDA</b>"]
        PROD1["<b>Product PDA 1</b>"]
        PROD2["<b>Product PDA 2</b>"]
        POLICY1["<b>Policy PDA 1</b>"]
        POLICY2["<b>Policy PDA 2</b>"]
        LP1["<b>LP PDA 1</b>"]
        LP2["<b>LP PDA 2</b>"]
        MINT_AUTH["<b>Mint Authority PDA</b>"]
    end
    
    subgraph "Token Accounts (Owned by Users/Vault)"
        USER1_USDC["<b>User USDC ATA</b><br/>Owner: User Wallet"]
        USER2_USDC["<b>User USDC ATA</b><br/>Owner: User Wallet"]
        VAULT["<b>Risk Pool Vault</b><br/>Owner: Config PDA"]
        USER1_NFT["<b>User NFT ATA</b><br/>Owner: User Wallet<br/>Frozen by Mint Authority"]
    end
    
    subgraph "Mint Accounts"
        NFT_MINT["<b>NFT Mint</b><br/>Authority: Mint Authority PDA"]
        USDC_MINT["<b>USDC Mint</b><br/>Authority: Token Program"]
    end
    
    ZYURA_PROG -.owns.-> CONFIG
    ZYURA_PROG -.owns.-> PROD1
    ZYURA_PROG -.owns.-> PROD2
    ZYURA_PROG -.owns.-> POLICY1
    ZYURA_PROG -.owns.-> POLICY2
    ZYURA_PROG -.owns.-> LP1
    ZYURA_PROG -.owns.-> LP2
    ZYURA_PROG -.owns.-> MINT_AUTH
    
    CONFIG -.owns.-> VAULT
    MINT_AUTH -.authority.-> NFT_MINT
    MINT_AUTH -.freeze authority.-> USER1_NFT
    
    style ZYURA_PROG fill:#667eea,stroke:#4c51bf,stroke-width:4px,color:#fff
    style CONFIG fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style PROD1 fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style PROD2 fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style POLICY1 fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style POLICY2 fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style LP1 fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style LP2 fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style MINT_AUTH fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
    style VAULT fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style USER1_USDC fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style USER2_USDC fill:#f6ad55,stroke:#dd6b20,stroke-width:2px,color:#1a202c
    style USER1_NFT fill:#fc8181,stroke:#e53e3e,stroke-width:2px,color:#fff
    style NFT_MINT fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style USDC_MINT fill:#68d391,stroke:#38a169,stroke-width:2px,color:#1a202c
```

---

## Part G: Security and Access Control

### 1. Authority Checks

```mermaid
flowchart TD
    START([Instruction Call]) --> CHECK_TYPE{Instruction Type}
    
    CHECK_TYPE -->|initialize| FIRST_TIME{Config Exists?}
    FIRST_TIME -->|Yes| ERROR1([Error: Already Initialized])
    FIRST_TIME -->|No| ALLOW1([Allow: First Initialization])
    
    CHECK_TYPE -->|Admin Operations| ADMIN_CHECK{Admin Signature Valid?}
    ADMIN_CHECK -->|No| ERROR2([Error: Unauthorized])
    ADMIN_CHECK -->|Yes| CHECK_PAUSE{Protocol Paused?}
    CHECK_PAUSE -->|Yes| ALLOW_PAUSE_ONLY{Operation is Pause?}
    CHECK_PAUSE -->|No| ALLOW2([Allow: Admin Operation])
    ALLOW_PAUSE_ONLY -->|Yes| ALLOW2
    ALLOW_PAUSE_ONLY -->|No| ERROR3([Error: Protocol Paused])
    
    CHECK_TYPE -->|purchase_policy| CHECK_PAUSE2{Protocol Paused?}
    CHECK_PAUSE2 -->|Yes| ERROR4([Error: Protocol Paused])
    CHECK_PAUSE2 -->|No| CHECK_PRODUCT{Product Active?}
    CHECK_PRODUCT -->|No| ERROR5([Error: Product Inactive])
    CHECK_PRODUCT -->|Yes| CHECK_PREMIUM{Premium >= Required?}
    CHECK_PREMIUM -->|No| ERROR6([Error: Insufficient Premium])
    CHECK_PREMIUM -->|Yes| ALLOW3([Allow: Policy Purchase])
    
    CHECK_TYPE -->|process_payout| ADMIN_CHECK2{Admin Signature Valid?}
    ADMIN_CHECK2 -->|No| ERROR7([Error: Unauthorized])
    ADMIN_CHECK2 -->|Yes| CHECK_STATUS{Policy Active?}
    CHECK_STATUS -->|No| ERROR8([Error: Policy Not Active])
    CHECK_STATUS -->|Yes| CHECK_DELAY{Delay >= Threshold?}
    CHECK_DELAY -->|No| ERROR9([Error: Threshold Not Met])
    CHECK_DELAY -->|Yes| ALLOW4([Allow: Payout])
    
    CHECK_TYPE -->|deposit_liquidity| CHECK_PAUSE3{Protocol Paused?}
    CHECK_PAUSE3 -->|Yes| ERROR10([Error: Protocol Paused])
    CHECK_PAUSE3 -->|No| ALLOW5([Allow: Deposit])
    
    CHECK_TYPE -->|withdraw_liquidity| ADMIN_CHECK3{Admin Signature Valid?}
    ADMIN_CHECK3 -->|No| ERROR11([Error: Unauthorized])
    ADMIN_CHECK3 -->|Yes| CHECK_BALANCE{LP Balance >= Amount?}
    CHECK_BALANCE -->|No| ERROR12([Error: Insufficient Balance])
    CHECK_BALANCE -->|Yes| ALLOW6([Allow: Withdrawal])
    
    style START fill:#667eea,stroke:#4c51bf,stroke-width:3px,color:#fff
    style CHECK_TYPE fill:#b794f4,stroke:#9f7aea,stroke-width:2px,color:#fff
    style FIRST_TIME fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ADMIN_CHECK fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ADMIN_CHECK2 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ADMIN_CHECK3 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PAUSE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PAUSE2 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PAUSE3 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PRODUCT fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_PREMIUM fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_STATUS fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_DELAY fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style CHECK_BALANCE fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ALLOW_PAUSE_ONLY fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style ALLOW1 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ALLOW2 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ALLOW3 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ALLOW4 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ALLOW5 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ALLOW6 fill:#10b981,stroke:#047857,stroke-width:3px,color:#fff
    style ERROR1 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR2 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR3 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR4 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR5 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR6 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR7 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR8 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR9 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR10 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR11 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
    style ERROR12 fill:#ef4444,stroke:#dc2626,stroke-width:3px,color:#fff
```

### 2. Error Handling Matrix

| Error Condition | Instruction | Error Code | Recovery Path |
|----------------|-------------|------------|---------------|
| Protocol Paused | purchase_policy, deposit_liquidity | ProtocolPaused | Admin must unpause |
| Product Inactive | purchase_policy | ProductInactive | Admin must activate product |
| Insufficient Premium | purchase_policy | InsufficientPremium | User must increase premium |
| Unauthorized | Admin operations | Unauthorized | Verify admin keypair |
| Policy Not Active | process_payout | PolicyNotActive | Policy already paid/expired |
| Delay Threshold Not Met | process_payout | DelayThresholdNotMet | Delay insufficient for payout |
| Insufficient Balance | withdraw_liquidity | InvalidAmount | LP must reduce amount |

---

## Part H: Summary and Key Design Decisions

### 1. Architecture Highlights

**Program Structure:**
- Single monolithic Anchor program for simplicity in POC
- Modular instruction handlers for clear separation of concerns
- PDA-based account management for deterministic addresses

**Account Design:**
- All protocol accounts use PDAs for security and determinism
- Config PDA as central authority store
- Product PDAs enable multiple insurance products
- Policy PDAs store individual policy state
- LP PDAs track per-provider liquidity positions

**Security Model:**
- Admin-controlled critical operations (payouts, withdrawals)
- Protocol-level pause mechanism for emergencies
- Product-level activation controls
- NFT account freezing for soulbound token behavior

**External Integration:**
- Switchboard oracle for flight delay verification
- Metaplex for NFT metadata and standardization
- SPL Token for USDC transfers and NFT minting

### 2. Scalability Considerations

```mermaid
graph LR
    subgraph "Current POC Design"
        POC["<b>Single ZYURA Program</b>"]
        POC --> PRODS["<b>Multiple Products</b>"]
        POC --> POLICIES["<b>Multiple Policies</b>"]
        POC --> LPS["<b>Multiple LPs</b>"]
    end
    
    subgraph "Future Enhancements"
        FUTURE["<b>Multi-Program Architecture</b>"]
        FUTURE --> PRODUCT_PROG["<b>Product Program</b>"]
        FUTURE --> POLICY_PROG["<b>Policy Program</b>"]
        FUTURE --> LIQ_PROG["<b>Liquidity Program</b>"]
        FUTURE --> GOV_PROG["<b>Governance Program</b>"]
    end
    
    POC -.evolves to.-> FUTURE
    
    style POC fill:#667eea,stroke:#4c51bf,stroke-width:4px,color:#fff
    style PRODS fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    style POLICIES fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style LPS fill:#38b2ac,stroke:#2c7a7b,stroke-width:2px,color:#fff
    style FUTURE fill:#10b981,stroke:#047857,stroke-width:4px,color:#fff
    style PRODUCT_PROG fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style POLICY_PROG fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1a202c
    style LIQ_PROG fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    style GOV_PROG fill:#9f7aea,stroke:#805ad5,stroke-width:2px,color:#fff
```

### 3. Design Rationale

1. **PDA-Based Accounts:** All protocol accounts use PDAs for:
   - Deterministic address derivation
   - Program ownership guarantees
   - Reduced key management overhead

2. **NFT as Policy Proof:** Policy NFTs serve as:
   - Immutable proof of insurance purchase
   - Non-transferable (frozen) to prevent policy trading
   - Metadata storage for policy details

3. **Admin-Controlled Payouts:** Payouts require admin signature to:
   - Enable oracle verification before on-chain execution
   - Allow manual review of edge cases
   - Prevent automated abuse in POC phase

4. **Single Vault Design:** One risk pool vault for:
   - Simplified liquidity management
   - Easier accounting and auditing
   - Clear separation of protocol funds

---

## Appendix: Diagram Legend

### Shapes and Colors

- **Blue Boxes (#4a90e2):** ZYURA Program and core accounts
- **Light Blue (#90cdf4):** Instruction modules
- **Green (#10b981):** Token/vault accounts and successful operations
- **Yellow (#fbbf24):** Policy accounts and oracle systems
- **Purple (#a78bfa):** NFT-related accounts
- **Orange (#ed8936):** External services
- **Red (#f56565):** Errors and rejected operations

### Arrow Types

- **Solid Arrows:** Direct calls/transfers
- **Dashed Arrows:** Cross-Program Invocations (CPI)
- **Dotted Arrows:** Data reads/references

### Account Types

- **PDAs:** Program-Derived Addresses (owned by ZYURA Program)
- **Token Accounts:** SPL Token Accounts (ATA = Associated Token Account)
- **Mint Accounts:** Token mint accounts
- **Metadata Accounts:** Metaplex metadata PDAs

---

**End of Assignment 3: Architecture Design**

