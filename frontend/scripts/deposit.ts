// scripts/deposit.ts
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const idlJson = require('../src/idl/zyura.json');

// CONFIG
const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX');
const USDC_MINT = new PublicKey('4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv');
const USER_KEYPAIR_PATH = process.env.USER_KEYPAIR || (process.env.HOME + '/.config/solana/phantom-devnet.json');
// Amount to deposit in 6dp (e.g., 100 USDC = 100_000_000)
const AMOUNT_6DP = new BN(parseInt(process.env.AMOUNT_6DP || '1000000', 10)); // default 1 USDC

function loadKeypair(fp: string): anchor.web3.Keypair {
  const fs = require('fs');
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const user = loadKeypair(USER_KEYPAIR_PATH);
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = new anchor.Wallet(user);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl);

  // PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [liquidityProviderPda] = PublicKey.findProgramAddressSync([Buffer.from('liquidity_provider'), user.publicKey.toBuffer()], PROGRAM_ID);

  // Accounts
  const userUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, user.publicKey);
  const riskPoolVault = getAssociatedTokenAddressSync(USDC_MINT, user.publicKey /* admin stored in config, but in this program risk_pool_vault is admin USDC ATA. We'll derive from config below. */);

  // Fetch config to read admin (vault authority)
  const cfgInfo = await connection.getAccountInfo(configPda);
  if (!cfgInfo) throw new Error('Config not initialized');
  const decodedConfig: any = coder.accounts.decode('Config', cfgInfo.data);
  const adminPubkey = new PublicKey(decodedConfig.admin);
  const riskPoolVaultAta = getAssociatedTokenAddressSync(USDC_MINT, adminPubkey);

  // Build ix: deposit_liquidity(amount)
  const data = coder.instruction.encode('deposit_liquidity', { amount: AMOUNT_6DP } as any);

  const keys = [
    { pubkey: configPda, isWritable: true, isSigner: false },
    { pubkey: liquidityProviderPda, isWritable: true, isSigner: false },
    { pubkey: riskPoolVaultAta, isWritable: true, isSigner: false },
    { pubkey: userUsdcAta, isWritable: true, isSigner: false },
    { pubkey: user.publicKey, isWritable: true, isSigner: true },
    { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isWritable: false, isSigner: false },
    { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
  ];

  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: user.publicKey, recentBlockhash: blockhash }).add(ix);
  const sig = await provider.sendAndConfirm(tx, []);
  console.log('Deposit liquidity tx:', sig);
}

main().catch(console.error);