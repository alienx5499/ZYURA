import * as anchor from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, Connection, clusterApiUrl, TransactionInstruction, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import BN from 'bn.js'
// Load IDL JSON via createRequire for ESM compatibility
const idlJson = require('../src/idl/zyura.json')

// CONFIG: update PROGRAM_ID if changed
const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX')
// Prefer explicit env path; else try phantom-devnet.json; else id.json
const ADMIN_KEYPAIR_PATH = (() => {
  if (process.env.ADMIN_KEYPAIR) return process.env.ADMIN_KEYPAIR
  const path = require('path')
  const fs = require('fs')
  const home = process.env.HOME || process.env.USERPROFILE
  const phantomPath = path.join(home, '.config/solana/phantom-devnet.json')
  if (fs.existsSync(phantomPath)) return phantomPath
  const idPath = path.join(home, '.config/solana/id.json')
  return idPath
})()
const PHANTOM_SECRET_KEY = process.env.PHANTOM_SECRET_KEY // base58-encoded 64-byte secret key from Phantom export
// Your Devnet USDC-like mint
const USDC_MINT = new PublicKey('4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv')

// Product params (6dp)
const PRODUCT_ID = new BN(2)
const DELAY_MIN = 30
const COVERAGE_6DP = new BN(100_000_000) // 100.000000
const PREMIUM_BPS = 100
const CLAIM_HOURS = 24

function loadKeypair(fp: string): Keypair {
  const fs = require('fs')
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

function loadPhantomKeypair(base58Secret: string): Keypair {
  const secret = bs58.decode(base58Secret)
  return Keypair.fromSecretKey(secret)
}

async function main() {
  const admin = PHANTOM_SECRET_KEY ? loadPhantomKeypair(PHANTOM_SECRET_KEY) : loadKeypair(ADMIN_KEYPAIR_PATH)
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const wallet = new anchor.Wallet(admin)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })

  const coder = new anchor.BorshCoder(idlJson as anchor.Idl)

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
  const [productPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('product'), PRODUCT_ID.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID,
  )

  // Initialize
  {
    const exists = await connection.getAccountInfo(configPda)
    if (exists) {
      console.log('Config already initialized:', configPda.toBase58())
    } else {
      const data = coder.instruction.encode('initialize', {
        admin: admin.publicKey,
        usdc_mint: USDC_MINT,
        switchboard_program: new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f'),
      } as any)
      const keys = [
        { pubkey: configPda, isWritable: true, isSigner: false },
        { pubkey: admin.publicKey, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
      ]
      const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data })
      const { blockhash } = await connection.getLatestBlockhash()
      const tx = new Transaction().add(ix)
      tx.feePayer = admin.publicKey
      tx.recentBlockhash = blockhash
      const sig = await provider.sendAndConfirm(tx, [])
      console.log('Initialized config:', sig)
    }
  }

  // Create product
  {
    const exists = await connection.getAccountInfo(productPda)
    if (exists) {
      console.log('Product already exists:', productPda.toBase58())
    } else {
      const data = coder.instruction.encode('create_product', {
        product_id: PRODUCT_ID, // u64
        delay_threshold_minutes: DELAY_MIN, // u32
        coverage_amount: COVERAGE_6DP, // u64
        premium_rate_bps: PREMIUM_BPS, // u16
        claim_window_hours: CLAIM_HOURS, // u32
      } as any)
      const keys = [
        { pubkey: configPda, isWritable: true, isSigner: false },
        { pubkey: productPda, isWritable: true, isSigner: false },
        { pubkey: admin.publicKey, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
      ]
      const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data })
      const { blockhash } = await connection.getLatestBlockhash()
      const tx = new Transaction().add(ix)
      tx.feePayer = admin.publicKey
      tx.recentBlockhash = blockhash
      const sig = await provider.sendAndConfirm(tx, [])
      console.log('Created product:', sig)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


