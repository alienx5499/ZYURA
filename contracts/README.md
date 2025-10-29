# ZYURA Contracts

## Deployment
- Network: Devnet
- Program ID: `H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX`
- Deployed with wallet: `~/.config/solana/phantom-devnet.json`

Verify:
- `solana program show H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX --url https://api.devnet.solana.com`

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
- Start local validator: `solana-test-validator --reset`
- Run tests (validator managed by Anchor): `anchor test`
- Or reuse validator: `anchor test --skip-local-validator`

Wallet selection for tests/deploys:
- `contracts/Anchor.toml` → `[provider].wallet = "~/.config/solana/phantom-devnet.json"`
- Override per-run: `ANCHOR_WALLET=/path/to/key.json anchor test`

## Notes / Attribution
- NFT minting and CPI wiring to Metaplex Token Metadata were added and verified with tests.
- This README and setup were prepared with assistance from an AI coding assistant.
