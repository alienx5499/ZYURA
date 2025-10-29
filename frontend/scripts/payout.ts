// scripts/payout.ts
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const idlJson = require('../src/idl/zyura.json');

// CONFIG
const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX');
const USDC_MINT = new PublicKey('4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv');

// ENV (edit or pass via env)
const ADMIN_KEYPAIR = process.env.ADMIN_KEYPAIR || (process.env.HOME + '/.config/solana/phantom-devnet.json');
const PRODUCT_ID = new BN(parseInt(process.env.PRODUCT_ID || '1', 10));
const POLICY_ID = new BN(parseInt(process.env.POLICY_ID || '0', 10)); // required
const POLICYHOLDER = process.env.POLICYHOLDER ? new PublicKey(process.env.POLICYHOLDER) : undefined; // optional; only used to log
const CLUSTER = (process.env.SOLANA_CLUSTER || 'devnet') as 'devnet' | 'testnet' | 'mainnet-beta';
const DELAY_MINUTES = parseInt(process.env.DELAY_MINUTES || '9999', 10); // must be >= threshold

function loadKeypair(fp: string) {
  const fs = require('fs');
  return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(fp, 'utf8'))));
}

async function main() {
  if (POLICY_ID.isZero()) throw new Error('Set POLICY_ID env to the purchased policy id');

  const admin = loadKeypair(ADMIN_KEYPAIR);
  const connection = new Connection(clusterApiUrl(CLUSTER), 'confirmed');
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [productPda] = PublicKey.findProgramAddressSync([Buffer.from('product'), PRODUCT_ID.toArrayLike(Buffer, 'le', 8)], PROGRAM_ID);
  const [policyPda] = PublicKey.findProgramAddressSync([Buffer.from('policy'), POLICY_ID.toArrayLike(Buffer, 'le', 8)], PROGRAM_ID);

  // Risk pool vault is the admin's USDC ATA
  const riskPoolVault = getAssociatedTokenAddressSync(USDC_MINT, admin.publicKey);

  // Build ix: process_payout(policy_id, delay_minutes)
  const data = coder.instruction.encode('process_payout', {
    policy_id: POLICY_ID,
    delay_minutes: DELAY_MINUTES,
  } as any);

  const keys = [
    { pubkey: configPda, isWritable: true, isSigner: false },
    { pubkey: productPda, isWritable: true, isSigner: false },
    { pubkey: policyPda, isWritable: true, isSigner: false },
    { pubkey: riskPoolVault, isWritable: true, isSigner: false },
    // policyholder_usdc_account is derived on-chain from the policyholder passed in accounts in IDL,
    // but IDL specifies explicit account; here we require the policyholder's ATA to be provided in the transaction.
    // In this script, we fetch it by reading the policy account for holder; to keep simple, let user pass a holder ATA.
  ];

  // Read policy to find holder for logging, not strictly required for tx
  try {
    const info = await connection.getAccountInfo(policyPda);
    if (info) {
      const dec: any = coder.accounts.decode('Policy', info.data);
      const holder = new PublicKey(dec.policyholder);
      const holderAta = getAssociatedTokenAddressSync(USDC_MINT, holder);
      keys.push({ pubkey: holderAta, isWritable: true, isSigner: false });
    }
  } catch {}

  keys.push({ pubkey: admin.publicKey, isWritable: true, isSigner: true });
  keys.push({ pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isWritable: false, isSigner: false });

  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: admin.publicKey, recentBlockhash: blockhash }).add(ix);
  const sig = await provider.sendAndConfirm(tx, []);
  console.log('Payout tx:', sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


