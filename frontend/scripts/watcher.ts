/*
  Policy watcher (no on-chain changes):
  - Scans all Active policies
  - For each, fetches flight delay from flight metadata repo (or API/mock)
  - If delay >= product threshold, calls process_payout (admin signs)

  Required:
  - ADMIN_KEYPAIR: Path to admin wallet keypair file
    Default: $HOME/.config/solana/phantom-devnet.json

  Optional:
  - RISK_POOL_VAULT: USDC token account (auto-derived from admin if not provided)
  - SOLANA_RPC: RPC URL (default: https://api.devnet.solana.com)
  - USE_FLIGHT_METADATA: Set to "true" to use GitHub flight metadata repo
  - GITHUB_FLIGHT_REPO: Flight metadata repo (default: alienx5499/zyura-flight-metadata)
  - GITHUB_BRANCH: Branch (default: main)
  - MOCK_DELAY_MINUTES: Mock delay for testing (if not using flight metadata)

  Run examples:
  # Using flight metadata repo (recommended):
  ADMIN_KEYPAIR=$HOME/.config/solana/id.json \
  USE_FLIGHT_METADATA=true \
  pnpm watcher

  # Using mock delay:
  ADMIN_KEYPAIR=$HOME/.config/solana/id.json \
  MOCK_DELAY_MINUTES=45 \
  pnpm watcher
*/

import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair, Connection, Transaction, TransactionInstruction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import BN from 'bn.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const idlJson = require('../src/idl/zyura.json')

type PolicyAccount = {
  id: anchor.BN
  policyholder: PublicKey
  productId: anchor.BN
  flightNumber: string
  departureTime: anchor.BN
  premiumPaid: anchor.BN
  coverageAmount: anchor.BN
  status: any
}

type ProductAccount = {
  id: anchor.BN
  delayThresholdMinutes: number
  coverageAmount: anchor.BN
  premiumRateBps: number
  claimWindowHours: number
  active: boolean
}

async function loadKeypair(fp: string): Promise<Keypair> {
  const fs = await import('fs')
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

/**
 * Update policy metadata in GitHub repo with payout transaction signature
 */
async function updatePolicyMetadataWithPayout(
  policyholder: PublicKey,
  policyId: anchor.BN,
  payoutTxSig: string
): Promise<void> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  const GITHUB_REPO = process.env.GITHUB_REPO || 'alienx5499/zyura-nft-metadata'
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
  
  if (!GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN not set, skipping metadata update')
    return
  }

  try {
    const wallet = policyholder.toBase58()
    const policyIdStr = policyId.toString()
    
    // Try multiple possible metadata paths
    const possiblePaths = [
      `metadata/${wallet}/${policyIdStr}/policy.json`,
      `metadata/${wallet}/policy-${policyIdStr}.json`,
      `${wallet}/${policyIdStr}/policy.json`,
      `${wallet}/policy-${policyIdStr}.json`,
    ]

    let metadataUrl: string | null = null
    let existingSha: string | null = null
    let metadata: any = null

    // Find the metadata file
    for (const path of possiblePaths) {
      const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`
      const checkRes = await fetch(checkUrl, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      })

      if (checkRes.ok) {
        const file = await checkRes.json()
        existingSha = file.sha
        metadataUrl = path
        
        // Decode the content
        const content = Buffer.from(file.content, file.encoding || 'base64').toString('utf8')
        metadata = JSON.parse(content)
        break
      }
    }

    if (!metadata) {
      console.warn(`Metadata not found for policy ${policyIdStr}, skipping payout tx update`)
      return
    }

    // Update metadata with payout transaction signature
    if (!metadata.attributes) {
      metadata.attributes = []
    }

    // Remove existing payout_tx_sig if present
    metadata.attributes = metadata.attributes.filter((attr: any) => 
      attr.trait_type !== 'Payout Transaction'
    )

    // Add payout transaction signature
    metadata.attributes.push({
      trait_type: 'Payout Transaction',
      value: payoutTxSig
    })

    // Also add as top-level field for easy access
    metadata.payout_transaction = payoutTxSig
    metadata.payout_tx_sig = payoutTxSig
    metadata.paid_at = new Date().toISOString()

    // Update the file
    const contentBase64 = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8').toString('base64')
    const uploadUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${metadataUrl}`
    const body: any = {
      message: `Update policy ${policyIdStr} metadata with payout transaction ${payoutTxSig}`,
      content: contentBase64,
      branch: GITHUB_BRANCH
    }
    if (existingSha) {
      body.sha = existingSha
    }

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!putRes.ok) {
      const err = await putRes.text()
      console.error(`❌ Failed to update metadata: ${putRes.status} ${err}`)
      return
    }

    console.log(`Updated metadata with payout transaction: ${payoutTxSig}`)
  } catch (err: any) {
    console.error(`❌ Error updating metadata:`, err?.message || err)
  }
}

/**
 * Fetch delay from flight metadata repo (new optimized structure)
 * Reads flights/{FLIGHT}/flight.json and calculates delay from actual_departure_unix
 */
async function fetchDelayFromFlightMetadata(flightNumber: string, date?: string): Promise<number> {
  const FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || 'alienx5499/zyura-flight-metadata'
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN

  try {
    // Add cache-busting query parameter to ensure fresh data
    const flightFileUrl = `https://raw.githubusercontent.com/${FLIGHT_REPO}/${GITHUB_BRANCH}/flights/${flightNumber}/flight.json?t=${Date.now()}`
    const res = await fetch(flightFileUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
    
    if (!res.ok) {
      console.log(`Flight ${flightNumber} not found in metadata repo`)
      return 0
    }

    const flightData = await res.json()
    
    // Debug logging for AA123
    if (flightNumber === 'AA123') {
      console.log(`[DEBUG] AA123 flight data:`, {
        actual_departure_unix: flightData.actual_departure_unix,
        scheduled_departure_unix: flightData.scheduled_departure_unix,
        delay_minutes: flightData.delay_minutes
      })
    }
    
    // Check date match if provided
    if (date && flightData.date !== date) {
      return 0
    }

    // If delay_minutes is already calculated, use it (prioritize this over calculation)
    if (typeof flightData.delay_minutes === 'number' && flightData.delay_minutes > 0) {
      return Math.max(0, flightData.delay_minutes)
    }

    // If actual_departure_unix is set, calculate delay
    if (flightData.actual_departure_unix && flightData.scheduled_departure_unix) {
      const delaySeconds = flightData.actual_departure_unix - flightData.scheduled_departure_unix
      const delayMinutes = Math.floor(delaySeconds / 60)
      return Math.max(0, delayMinutes) // No negative delays
    }

    return 0
  } catch (err) {
    console.error(`Error fetching delay for ${flightNumber}:`, err)
    return 0
  }
}

async function fetchDelayMinutes(flightNumber: string, departure?: string): Promise<number> {
  // Try flight metadata repo first (new optimized approach)
  const delayFromMetadata = await fetchDelayFromFlightMetadata(flightNumber, departure)
  if (delayFromMetadata > 0 || process.env.USE_FLIGHT_METADATA === 'true') {
    return delayFromMetadata
  }

  // Fallback to external API or mock
  const base = process.env.FLIGHT_API_BASE
  const apiKey = process.env.FLIGHT_API_KEY
  const mock = process.env.MOCK_DELAY_MINUTES

  if (!base) {
    const val = Number(mock ?? '0')
    return Number.isFinite(val) ? val : 0
  }

  const u = new URL(base)
  u.searchParams.set('num', flightNumber)
  if (departure) u.searchParams.set('date', departure)

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`

  const res = await fetch(u.toString(), { method: 'GET', headers, cache: 'no-store' })
  if (!res.ok) return 0
  const json: any = await res.json().catch(() => ({}))
  const n = Number(json?.delay_minutes ?? 0)
  return Number.isFinite(n) ? n : 0
}

async function main() {
  const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX')
  const rpcUrl = process.env.SOLANA_RPC || 'https://api.devnet.solana.com'
  const adminKeypairPath = process.env.ADMIN_KEYPAIR || (process.env.HOME + '/.config/solana/phantom-devnet.json')

  const connection = new Connection(rpcUrl, { commitment: 'confirmed' })
  const admin = await loadKeypair(adminKeypairPath)
  const wallet = new anchor.Wallet(admin)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)

  // Use BorshCoder to decode accounts (works around IDL structure issues)
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl)

  // Fetch config to get USDC mint
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
  const configInfo = await connection.getAccountInfo(configPda)
  if (!configInfo) throw new Error('Config account not found. Run admin initialize first.')
  const configAcc: any = coder.accounts.decode('Config', configInfo.data)
  // Handle decoded PublicKey - BorshCoder returns PublicKey as array of bytes [32 bytes]
  let usdcMint: PublicKey
  if (configAcc.usdcMint instanceof PublicKey) {
    usdcMint = configAcc.usdcMint
  } else if (Array.isArray(configAcc.usdcMint) && configAcc.usdcMint.length === 32) {
    usdcMint = new PublicKey(Buffer.from(configAcc.usdcMint))
  } else if (typeof configAcc.usdcMint === 'string') {
    usdcMint = new PublicKey(configAcc.usdcMint)
  } else {
    // Fallback: use default USDC mint
    console.warn('Could not decode usdcMint from config, using default')
    usdcMint = new PublicKey('4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv')
  }

  // Auto-derive risk pool vault from admin's USDC ATA (or use provided)
  const riskPoolVaultStr = process.env.RISK_POOL_VAULT
  const riskPoolVault = riskPoolVaultStr 
    ? new PublicKey(riskPoolVaultStr)
    : getAssociatedTokenAddressSync(usdcMint, admin.publicKey)
  
  console.log(`Admin: ${admin.publicKey.toBase58()}`)
  console.log(`Risk Pool Vault: ${riskPoolVault.toBase58()}`)

  // Fetch all policies using getProgramAccounts
  const policyDiscriminator = coder.accounts.accountDiscriminator('Policy')
  const allPolicyAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(policyDiscriminator) } }]
  })

  console.log(`Found ${allPolicyAccounts.length} total policy accounts`)

  // Decode and filter Active policies
  const activePolicies: Array<{ publicKey: PublicKey; account: PolicyAccount }> = []
  for (const acc of allPolicyAccounts) {
    try {
      const decoded: any = coder.accounts.decode('Policy', acc.account.data)
      // PolicyStatus is an enum: { Active: {} }, { PaidOut: {} }, or { Expired: {} }
      const isActive = decoded.status?.Active !== undefined
      if (isActive) {
        // Handle PublicKey conversion
        let policyholder: PublicKey
        if (decoded.policyholder instanceof PublicKey) {
          policyholder = decoded.policyholder
        } else if (Array.isArray(decoded.policyholder) && decoded.policyholder.length === 32) {
          policyholder = new PublicKey(Buffer.from(decoded.policyholder))
        } else if (typeof decoded.policyholder === 'string') {
          policyholder = new PublicKey(decoded.policyholder)
        } else {
          // Try to convert from BN or other formats
          const pkBytes = decoded.policyholder?._bn || decoded.policyholder
          if (pkBytes && Array.isArray(pkBytes) && pkBytes.length === 32) {
            policyholder = new PublicKey(Buffer.from(pkBytes))
          } else {
            throw new Error(`Cannot decode policyholder for policy ${acc.pubkey.toBase58()}: ${JSON.stringify(decoded.policyholder)}`)
          }
        }
        
      // Helper to convert values to BN (BorshCoder may return hex strings or BN objects)
      const toBN = (val: any): anchor.BN => {
        if (!val) return new anchor.BN(0)
        if (val instanceof anchor.BN) return val
        if (typeof val === 'string') {
          // Check if it's a hex string (starts with 0x or is hex-like)
          if (val.startsWith('0x')) return new anchor.BN(val.slice(2), 'hex')
          // Try parsing as hex first, fallback to decimal
          try {
            return new anchor.BN(val, 'hex')
          } catch {
            return new anchor.BN(val, 10)
          }
        }
        return new anchor.BN(val.toString())
      }
        
        activePolicies.push({
          publicKey: acc.pubkey,
          account: {
            id: toBN(decoded.id),
            policyholder,
            productId: toBN(decoded.product_id),
            flightNumber: decoded.flight_number || '',
            departureTime: toBN(decoded.departure_time),
            premiumPaid: toBN(decoded.premium_paid),
            coverageAmount: toBN(decoded.coverage_amount),
            status: decoded.status
          }
        })
      }
    } catch (e: any) {
      // Log error but continue processing other policies
      console.error(`Error processing policy ${acc.pubkey.toBase58()}:`, e?.message || e)
      continue
    }
  }

  if (activePolicies.length === 0) {
    console.log('No active policies found')
    return
  }

  console.log(`Scanning ${activePolicies.length} active policies...`)

  // Helper to convert values to BN (BorshCoder may return hex strings or BN objects)
  const toBN = (val: any): anchor.BN => {
    if (!val) return new anchor.BN(0)
    if (val instanceof anchor.BN) return val
    if (typeof val === 'string') {
      if (val.startsWith('0x')) return new anchor.BN(val.slice(2), 'hex')
      try {
        return new anchor.BN(val, 'hex')
      } catch {
        return new anchor.BN(val, 10)
      }
    }
    return new anchor.BN(val.toString())
  }

  for (const p of activePolicies) {
    try {
      const policy = p.account

      // Fetch product for threshold
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('product'), policy.productId.toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID,
      )
      const productInfo = await connection.getAccountInfo(productPda)
      if (!productInfo) {
        console.log(`Policy ${policy.id.toString()}: Product ${policy.productId.toString()} not found`)
        continue
      }
      const productDecoded: any = coder.accounts.decode('Product', productInfo.data)
      // Product fields are also snake_case
      const product = {
        id: toBN(productDecoded.id),
        delayThresholdMinutes: productDecoded.delay_threshold_minutes || 0,
        coverageAmount: toBN(productDecoded.coverage_amount),
        premiumRateBps: productDecoded.premium_rate_bps || 0,
        claimWindowHours: productDecoded.claim_window_hours || 0,
        active: productDecoded.active || false
      }
      if (!product.active) {
        console.log(`Policy ${policy.id.toString()}: Product ${policy.productId.toString()} is inactive`)
        continue
      }

      // Derive policyholder USDC ATA
      const policyholderUsdcAta = getAssociatedTokenAddressSync(usdcMint, policy.policyholder)

      // Convert departure_time (unix) to YYYY-MM-DD if needed
      const dtUnix = Number(policy.departureTime)
      const dateStr = isFinite(dtUnix) && dtUnix > 0
        ? new Date(dtUnix * 1000).toISOString().slice(0, 10)
        : undefined

      const delay = await fetchDelayMinutes(policy.flightNumber, dateStr)
      console.log(`Policy ${policy.id.toString()} flight ${policy.flightNumber} delay=${delay} min (threshold=${product.delayThresholdMinutes})`)

    if (delay >= product.delayThresholdMinutes) {
      try {
        // Build transaction using coder
        const data = coder.instruction.encode('process_payout', {
          policy_id: policy.id,
          delay_minutes: delay
        } as any)

        const keys = [
          { pubkey: configPda, isWritable: true, isSigner: false },
          { pubkey: productPda, isWritable: true, isSigner: false },
          { pubkey: p.publicKey, isWritable: true, isSigner: false },
          { pubkey: riskPoolVault, isWritable: true, isSigner: false },
          { pubkey: policyholderUsdcAta, isWritable: true, isSigner: false },
          { pubkey: admin.publicKey, isWritable: true, isSigner: true },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ]

        const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data })
        const { blockhash } = await connection.getLatestBlockhash()
        const tx = new Transaction({ feePayer: admin.publicKey, recentBlockhash: blockhash }).add(ix)
        const sig = await provider.sendAndConfirm(tx, [admin])
        console.log(`Payout processed for policy ${policy.id.toString()}`)
        console.log(`   Transaction: ${sig}`)
        
        // Update metadata in GitHub repo with payout transaction signature
        await updatePolicyMetadataWithPayout(policy.policyholder, policy.id, sig)
      } catch (err: any) {
        console.error(`❌ Payout failed for policy ${policy.id.toString()}:`, err?.message || err)
      }
    }
    } catch (err: any) {
      console.error(`❌ Error processing policy ${p.account.id.toString()}:`, err?.message || err)
      continue
    }
  }
  
  console.log('Watcher scan complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


