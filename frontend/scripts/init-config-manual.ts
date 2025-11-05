import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, clusterApiUrl } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'

// CONFIG
const PROGRAM_ID = new PublicKey('DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX')
const USDC_MINT = new PublicKey(process.env.USDC_MINT || '4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv')
const SWITCHBOARD_PROGRAM_ID = new PublicKey(process.env.SWITCHBOARD_PID || 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f')
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('devnet')
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', '.config/solana/phantom-devnet.json')

function loadKeypair(fp: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function main() {
  const admin = loadKeypair(ADMIN_KEYPAIR_PATH)
  const connection = new Connection(RPC_URL, 'confirmed')

  // Load IDL and coder
  const idlPath = path.join(__dirname, '../src/idl/zyura.json')
  const idlJson = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as anchor.Idl
  const coder = new anchor.BorshCoder(idlJson)

  // PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)

  console.log('Admin:', admin.publicKey.toString())
  console.log('Config PDA:', configPda.toString())

  // Encode instruction data
  const data = coder.instruction.encode('initialize', {
    admin: admin.publicKey,
    usdcMint: USDC_MINT,
    switchboardProgram: SWITCHBOARD_PROGRAM_ID,
  } as any)

  const keys = [
    { pubkey: configPda, isSigner: false, isWritable: true },
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
  console.log('Initialize tx:', sig)
  await connection.confirmTransaction(sig, 'confirmed')
  console.log('✓ Config initialized')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
