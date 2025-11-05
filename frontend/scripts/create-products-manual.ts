import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, clusterApiUrl } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import BN from 'bn.js'
import * as fs from 'fs'
import * as path from 'path'

// CONFIG
const PROGRAM_ID = new PublicKey('DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX')
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('devnet')
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', '.config/solana/phantom-devnet.json')

function loadKeypair(fp: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function createProduct(connection: Connection, coder: anchor.BorshCoder, admin: Keypair, p: { id: number; delayMin: number; coverage6dp: number; premiumBps: number; claimHours: number; label: string }) {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
  const [productPda] = PublicKey.findProgramAddressSync([Buffer.from('product'), new BN(p.id).toArrayLike(Buffer, 'le', 8)], PROGRAM_ID)

  const info = await connection.getAccountInfo(productPda)
  if (info) {
    console.log(`✓ Product ${p.id} already exists: ${p.label}`)
    return
  }

  console.log(`Creating product ${p.id}: ${p.label}`)
  const data = coder.instruction.encode('create_product', {
    product_id: new BN(p.id),
    delay_threshold_minutes: p.delayMin,
    coverage_amount: new BN(p.coverage6dp),
    premium_rate_bps: p.premiumBps,
    claim_window_hours: p.claimHours,
  } as any)

  const keys = [
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: productPda, isSigner: false, isWritable: true },
    { pubkey: admin.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data })
  const tx = new Transaction().add(ix)
  tx.feePayer = admin.publicKey
  const { blockhash } = await connection.getLatestBlockhash('finalized')
  tx.recentBlockhash = blockhash
  tx.sign(admin)
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 })
  console.log(`  tx: ${sig}`)
  await connection.confirmTransaction(sig, 'confirmed')
  console.log(`  ✓ Created product ${p.id}`)
}

async function main() {
  const admin = loadKeypair(ADMIN_KEYPAIR_PATH)
  const connection = new Connection(RPC_URL, 'confirmed')

  const idlPath = path.join(__dirname, '../src/idl/zyura.json')
  const idlJson = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as anchor.Idl
  const coder = new anchor.BorshCoder(idlJson)

  const products = [
    { id: 1, delayMin: 60, coverage6dp: 100_000_000, premiumBps: 120, claimHours: 24, label: 'Domestic Basic (60m, $100)' },
    { id: 2, delayMin: 90, coverage6dp: 200_000_000, premiumBps: 150, claimHours: 48, label: 'Domestic Plus (90m, $200)' },
    { id: 3, delayMin: 120, coverage6dp: 500_000_000, premiumBps: 180, claimHours: 48, label: 'International Basic (120m, $500)' },
    { id: 4, delayMin: 180, coverage6dp: 1_000_000_000, premiumBps: 220, claimHours: 72, label: 'International Plus (180m, $1000)' },
    { id: 5, delayMin: 240, coverage6dp: 2_000_000_000, premiumBps: 250, claimHours: 96, label: 'Long-Haul Premium (240m, $2000)' },
  ]

  for (const p of products) {
    await createProduct(connection, coder, admin, p)
  }

  console.log('\nAll products ensured. Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
