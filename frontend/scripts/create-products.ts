import * as anchor from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, Connection, clusterApiUrl } from '@solana/web3.js'
import BN from 'bn.js'
import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'
const require = createRequire(import.meta.url)
const idlJson = require('../src/idl/zyura.json')

// CONFIG
const PROGRAM_ID = new PublicKey('DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX')
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('devnet')
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', '.config/solana/phantom-devnet.json')

function loadKeypair(fp: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function main() {
  const admin = loadKeypair(ADMIN_KEYPAIR_PATH)
  const connection = new Connection(RPC_URL, 'confirmed')
  const wallet = new anchor.Wallet(admin)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)

  const program = new anchor.Program(idlJson as anchor.Idl, PROGRAM_ID, provider)

  // PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)

  // Quick check config exists
  const cfgInfo = await connection.getAccountInfo(configPda)
  if (!cfgInfo) {
    throw new Error('Config not initialized. Run close-and-reinit-config.ts first with your admin wallet.')
  }

  const products: Array<{
    id: number
    delayMin: number
    coverage6dp: number
    premiumBps: number
    claimHours: number
    label: string
  }> = [
    { id: 1, delayMin: 60, coverage6dp: 100_000_000, premiumBps: 120, claimHours: 24, label: 'Domestic Basic (60m, $100)' },
    { id: 2, delayMin: 90, coverage6dp: 200_000_000, premiumBps: 150, claimHours: 48, label: 'Domestic Plus (90m, $200)' },
    { id: 3, delayMin: 120, coverage6dp: 500_000_000, premiumBps: 180, claimHours: 48, label: 'International Basic (120m, $500)' },
    { id: 4, delayMin: 180, coverage6dp: 1_000_000_000, premiumBps: 220, claimHours: 72, label: 'International Plus (180m, $1000)' },
    { id: 5, delayMin: 240, coverage6dp: 2_000_000_000, premiumBps: 250, claimHours: 96, label: 'Long-Haul Premium (240m, $2000)' },
  ]

  for (const p of products) {
    const [productPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('product'), new BN(p.id).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )

    const info = await connection.getAccountInfo(productPda)
    if (info) {
      console.log(`✓ Product ${p.id} already exists: ${p.label}`)
      continue
    }

    console.log(`Creating product ${p.id}: ${p.label}`)
    const tx = await program.methods
      .createProduct(
        new BN(p.id),
        p.delayMin,
        new BN(p.coverage6dp),
        p.premiumBps,
        p.claimHours,
      )
      .accounts({
        config: configPda,
        product: productPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    await connection.confirmTransaction(tx, 'confirmed')
    console.log(`  ✓ Created product ${p.id} (tx: ${tx})`)
  }

  console.log('\nAll products ensured. Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
