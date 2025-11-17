# ZYURA Contracts

## Deployment
- Network: Devnet
- Program ID: `DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX`
- Deployed with wallet: `~/.config/solana/phantom-devnet.json`

Verify:
- `solana program show DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX --url https://api.devnet.solana.com`

## Workflow (high-level)
- Initialize config (admin, USDC mint, Switchboard program id)
- Create flight-delay `Product` (coverage, premium rate, delay threshold, claim window)
- Liquidity providers deposit USDC to risk pool vault
- Customer purchases policy:
  - Premium USDC transfers to risk pool
  - `Policy` account created Active
  - An NFT is minted (1 supply) to the buyer as proof-of-insurance
  - Optional: Metaplex Metadata + Master Edition created via CPI
- Eligible delay -> payout transfers USDC to policyholder; policy becomes PaidOut

## Purchase Policy Accounts
Pass these in addition to existing ones:
- `policy_nft_mint` (init, decimals = 0)
- `user_policy_nft_ata` (init via associated token program)
- `mint_authority` PDA `["policy_mint_authority"]`
- `metadata_account` (PDA) and `master_edition_account` (PDA) if creating metadata
- `token_metadata_program` (Metaplex) if creating metadata
- `associated_token_program`, `token_program`, `system_program`, `rent`

Handler signature:
- `purchase_policy(policy_id, flight_number, departure_time, premium_amount, create_metadata)`
  - Set `create_metadata = false` locally if the metadata program is not deployed

## Local development

### Prerequisites
- **Rust** (latest stable)
- **Solana CLI** installed and configured
- **Anchor** framework installed
- **Node.js** 18+ and **pnpm** (or yarn)

### Setup
```bash
# Install dependencies
pnpm install

# Build the program
anchor build

# Run tests (validator managed by Anchor)
anchor test

# Or reuse existing validator
anchor test --skip-local-validator
```

### Start Local Validator
```bash
# Start a fresh local validator
solana-test-validator --reset
```

### Wallet Configuration
- Default wallet: `contracts/Anchor.toml` → `[provider].wallet = "~/.config/solana/phantom-devnet.json"`
- Override per-run: `ANCHOR_WALLET=/path/to/key.json anchor test`

## Code Formatting

### Format JavaScript/TypeScript/JSON
```bash
# Format all JS/TS/JSON files
pnpm format

# Check formatting without making changes
pnpm format:check
```

### Format Rust Code
```bash
# Format all Rust code
cargo fmt
```

## Testing

Run all tests:
```bash
anchor test
```

Run specific test file:
```bash
anchor test tests/policy-purchase.test.ts
```

### Using Surfpool (localnet)

1. Install Surfpool (one-time):
   ```bash
   curl -sL https://run.surfpool.run/ | bash
   ```
2. Start Surfpool (surfnet) in another terminal:
   ```bash
   surfpool start
   ```
3. Run Anchor tests without spawning the built-in validator, pointing at the Surfpool instance:
   ```bash
   anchor test --skip-local-validator
```

## Build

Build the program:
```bash
anchor build
```

The compiled program will be in `target/deploy/zyura.so`

## Deployment

Deploy to devnet:
```bash
anchor deploy
```

## Notes / Attribution
- NFT minting and CPI wiring to Metaplex Token Metadata were added and verified with tests.
- This README and setup were prepared with assistance from an AI coding assistant.
