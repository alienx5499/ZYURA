import * as anchor from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, Connection, clusterApiUrl, TransactionInstruction, Transaction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, createAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'
import BN from 'bn.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const idlJson = require('../src/idl/zyura.json')
const fs = require('fs')
const path = require('path')
const __dirname_es = path.dirname(new URL(import.meta.url).pathname)

// CONFIG
const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX')
const CONSUMER_KEYPAIR_PATH = process.env.CONSUMER_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`
const PHANTOM_SECRET_KEY = process.env.PHANTOM_SECRET_KEY // optional base58
const USDC_MINT = new PublicKey(process.env.USDC_MINT ?? '4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN // GitHub Personal Access Token (required for repo uploads)
const GITHUB_REPO = process.env.GITHUB_REPO // Format: "username/repo-name" (e.g., "myusername/zyura-nft-metadata")
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main' // Branch to upload to (default: main)
const GITHUB_PATH = process.env.GITHUB_PATH || 'metadata' // Directory path in repo (default: metadata)

// Inputs
const PRODUCT_ID = new BN(Number(process.env.PRODUCT_ID ?? 1))
const POLICY_ID = new BN(Number(process.env.POLICY_ID ?? 1))
const FLIGHT_NUMBER = process.env.FLIGHT_NUMBER ?? 'AA123'
const DEPARTURE_TIME = new BN(Number(process.env.DEPARTURE_UNIX ?? Math.floor(Date.now() / 1000) + 3600))
const PREMIUM_6DP = new BN(Number(process.env.PREMIUM_6DP ?? 1_000_000)) // 1.000000

function loadKeypair(fp: string): Keypair {
  const fs = require('fs')
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}
function loadPhantomKeypair(base58Secret: string): Keypair {
  const secret = bs58.decode(base58Secret)
  return Keypair.fromSecretKey(secret)
}

/**
 * Uploads a file (SVG or JSON) to GitHub repository and returns the raw URL.
 */
async function uploadFileToRepo(content: string, filePath: string, message: string): Promise<string> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO must be set')
  }

  const contentBase64 = Buffer.from(content, 'utf8').toString('base64')
  const fullPath = `${GITHUB_PATH}/${filePath}`
  
  // Check if file exists
  const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`
  let existingSha: string | null = null
  
  try {
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json()
      existingSha = existingFile.sha
    }
  } catch (e) {
    // File doesn't exist yet
  }

  const uploadUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`
  const uploadBody: any = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH,
  }
  
  if (existingSha) {
    uploadBody.sha = existingSha
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(uploadBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload file to GitHub: ${response.status} ${error}`)
  }

  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${fullPath}`
  return rawUrl
}

/**
 * Uploads metadata JSON to a GitHub repository and returns the raw URL.
 * Requires GITHUB_TOKEN and GITHUB_REPO environment variables.
 */
async function uploadMetadataToRepo(metadata: any, policyId: string): Promise<string> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    const metadataJson = JSON.stringify(metadata)
    // For very small metadata, data URI might work as fallback
    if (metadataJson.length < 8000) {
      console.warn('⚠️  GITHUB_TOKEN or GITHUB_REPO not set. Using data URI (may fail if too large).')
      const base64 = Buffer.from(metadataJson).toString('base64')
      return `data:application/json;base64,${base64}`
    }
    throw new Error(
      'Metadata too large for data URI. Please set GITHUB_TOKEN and GITHUB_REPO environment variables.\n' +
      'Example: GITHUB_REPO=username/repo-name'
    )
  }

  const fileContent = JSON.stringify(metadata, null, 2)
  const filename = `policy-${policyId}.json`
  const rawUrl = await uploadFileToRepo(
    fileContent,
    filename,
    `Add/update metadata for ZYURA Policy ${policyId}`
  )
  console.log(`✅ Uploaded metadata to GitHub: ${rawUrl}`)
  return rawUrl
}

async function main() {
  const consumer = PHANTOM_SECRET_KEY ? loadPhantomKeypair(PHANTOM_SECRET_KEY) : loadKeypair(CONSUMER_KEYPAIR_PATH)
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const wallet = new anchor.Wallet(consumer)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl)

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
  const [productPda] = PublicKey.findProgramAddressSync([Buffer.from('product'), PRODUCT_ID.toArrayLike(Buffer, 'le', 8)], PROGRAM_ID)
  const [policyPda] = PublicKey.findProgramAddressSync([Buffer.from('policy'), POLICY_ID.toArrayLike(Buffer, 'le', 8)], PROGRAM_ID)
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  // Ensure Consumer USDC ATA exists
  const userAta = await getOrCreateAssociatedTokenAccount(connection, consumer, USDC_MINT, consumer.publicKey)
  const userUsdcAccount = userAta.address

  // Use Phantom/admin USDC ATA as the protocol risk pool vault
  const configAccountInfo = await connection.getAccountInfo(configPda)
  if (!configAccountInfo) throw new Error('Config account not found. Run admin initialize first.')
  const decodedConfig: any = coder.accounts.decode('Config', configAccountInfo.data)
  const adminPubkey = new PublicKey(decodedConfig.admin)
  const adminAta = await getOrCreateAssociatedTokenAccount(connection, consumer, USDC_MINT, adminPubkey)
  const riskPoolVault = adminAta.address

  // NFT mint and ATA
  const policyNftMint = Keypair.generate()
  const userPolicyNftAta = getAssociatedTokenAddressSync(policyNftMint.publicKey, consumer.publicKey)
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )
  const [masterEditionAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer(), Buffer.from('edition')],
    TOKEN_METADATA_PROGRAM_ID,
  )
  const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from('policy_mint_authority')], PROGRAM_ID)

  // Build image from the public/zyura.svg template by replacing placeholders
  const svgPath = path.resolve(__dirname_es, '../public/zyura.svg')
  let svg = fs.readFileSync(svgPath, 'utf8')
  const departureIso = new Date(Number(DEPARTURE_TIME.toString()) * 1000).toISOString()
  
  // Convert 6dp values to USD format (divide by 1,000,000)
  const premiumUsd = (Number(PREMIUM_6DP.toString()) / 1_000_000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const coverageUsd = (100_000_000 / 1_000_000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  
  svg = svg
    .replaceAll('[FLIGHT_NUMBER]', FLIGHT_NUMBER)
    .replaceAll('[POLICY_ID]', POLICY_ID.toString())
    .replaceAll('[PRODUCT_ID]', PRODUCT_ID.toString())
    .replaceAll('[DEPARTURE_ISO]', departureIso)
    .replaceAll('[PREMIUM_6DP]', premiumUsd)
    .replaceAll('[COVERAGE_6DP]', coverageUsd)
  
  // Upload SVG image to GitHub first
  console.log('📤 Uploading SVG image to GitHub...')
  const svgFilename = `policy-${POLICY_ID.toString()}.svg`
  const svgUrl = await uploadFileToRepo(
    svg,
    svgFilename,
    `Add SVG image for ZYURA Policy ${POLICY_ID.toString()}`
  )
  console.log(`✅ Uploaded SVG: ${svgUrl}`)

  // Create metadata with GitHub URL for the image (not data URI)
  const metadata = {
    name: `ZYURA Policy ${POLICY_ID.toString()} ${FLIGHT_NUMBER}`.slice(0, 32),
    symbol: 'ZYURA',
    image: svgUrl, // Use GitHub raw URL instead of data URI
    attributes: [
      { trait_type: 'Product ID', value: PRODUCT_ID.toString() },
      { trait_type: 'Policy ID', value: POLICY_ID.toString() },
      { trait_type: 'Flight', value: FLIGHT_NUMBER },
      { trait_type: 'Departure', value: departureIso },
      { trait_type: 'Premium (6dp)', value: PREMIUM_6DP.toString() },
    ],
  }

  // Upload metadata to GitHub repository
  console.log('📤 Uploading metadata JSON to GitHub repository...')
  const metadataUri = await uploadMetadataToRepo(metadata, POLICY_ID.toString())
  console.log(`✅ Metadata URI: ${metadataUri.substring(0, 100)}...`)

  // Build instruction via coder
  const data = coder.instruction.encode('purchase_policy', {
    policy_id: POLICY_ID,
    flight_number: FLIGHT_NUMBER,
    departure_time: DEPARTURE_TIME,
    premium_amount: PREMIUM_6DP,
    create_metadata: true,
    metadata_uri: metadataUri,
  } as any)
  const keys = [
    { pubkey: configPda, isWritable: true, isSigner: false },
    { pubkey: productPda, isWritable: true, isSigner: false },
    { pubkey: policyPda, isWritable: true, isSigner: false },
    { pubkey: riskPoolVault, isWritable: true, isSigner: false },
    { pubkey: userUsdcAccount, isWritable: true, isSigner: false },
    { pubkey: consumer.publicKey, isWritable: true, isSigner: true },
    { pubkey: policyNftMint.publicKey, isWritable: true, isSigner: true },
    { pubkey: userPolicyNftAta, isWritable: true, isSigner: false },
    { pubkey: metadataAccount, isWritable: true, isSigner: false },
    { pubkey: masterEditionAccount, isWritable: true, isSigner: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: mintAuthority, isWritable: false, isSigner: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isWritable: false, isSigner: false },
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
  ]
  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data })
  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new Transaction().add(ix)
  tx.feePayer = consumer.publicKey
  tx.recentBlockhash = blockhash
  tx.partialSign(policyNftMint)
  const sig = await provider.sendAndConfirm(tx, [policyNftMint])
  console.log('Purchased policy:', sig)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


