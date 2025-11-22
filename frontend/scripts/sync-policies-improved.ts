import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const require = createRequire(import.meta.url)
const idlJson = require('../src/idl/zyura.json')

// Load environment variables explicitly
const __dirname_es = path.dirname(new URL(import.meta.url).pathname)
const envPath = path.resolve(__dirname_es, '../.env')
const envLocalPath = path.resolve(__dirname_es, '../.env.local')

console.log('🔧 Loading environment variables...')
if (fs.existsSync(envPath)) {
  console.log(`  ✅ Loading .env from: ${envPath}`)
  dotenv.config({ path: envPath })
} else {
  console.log(`  ❌ .env not found at: ${envPath}`)
}

if (fs.existsSync(envLocalPath)) {
  console.log(`  ✅ Loading .env.local from: ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log(`  ℹ️  .env.local not found (optional)`)
}

// CONFIG
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX')
const RPC_URL = process.env.RPC_URL || clusterApiUrl('devnet')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const GITHUB_PATH = process.env.GITHUB_PATH || 'metadata'
const GITHUB_FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO

interface OnChainPolicy {
  id: string
  address: string
  policyholder: string
  flightNumber: string
  departureTime: number
  valid: boolean
  productId?: string
  status?: any
  createdAt?: number
}

interface GitHubPolicy {
  policyId: string
  walletAddress: string
  filePath: string
  sha: string
}

interface FlightData {
  flightNumber: string
  filePath: string
  sha: string
}

async function fetchOnChainPolicies(): Promise<OnChainPolicy[]> {
  console.log('\n🔍 Fetching on-chain policies...')
  
  const connection = new Connection(RPC_URL, 'confirmed')
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl)
  
  try {
    const policyDiscriminator = coder.accounts.accountDiscriminator('Policy')
    const policyAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor.utils.bytes.bs58.encode(policyDiscriminator),
          },
        },
      ],
    })

    console.log(`📊 Found ${policyAccounts.length} policy accounts`)

    const policies: OnChainPolicy[] = []
    
    for (const account of policyAccounts) {
      try {
        const decoded: any = coder.accounts.decode('Policy', account.account.data)
        
        // Check if this looks like a valid policy (using snake_case field names)
        const hasId = decoded.id && decoded.id.toString()
        const hasPolicyholder = decoded.policyholder && decoded.policyholder.toString()
        const hasFlightNumber = decoded.flight_number && typeof decoded.flight_number === 'string'
        
        const policy: OnChainPolicy = {
          id: hasId ? decoded.id.toString() : 'unknown',
          address: account.pubkey.toString(),
          policyholder: hasPolicyholder ? decoded.policyholder.toString() : 'unknown',
          flightNumber: hasFlightNumber ? decoded.flight_number : 'unknown',
          departureTime: decoded.departure_time ? Number(decoded.departure_time.toString()) : 0,
          valid: hasId && hasPolicyholder && hasFlightNumber,
          productId: decoded.product_id ? decoded.product_id.toString() : undefined,
          status: decoded.status || undefined,
          createdAt: decoded.created_at ? Number(decoded.created_at.toString()) : undefined
        }
        
        policies.push(policy)
        
        if (policy.valid) {
          console.log(`  ✅ Policy ${policy.id}: ${policy.flightNumber} (${policy.policyholder.slice(0,8)}...)`)
        } else {
          console.log(`  ❌ Invalid policy at ${policy.address} (missing fields)`)
        }
        
      } catch (decodeError) {
        console.log(`  ❌ Failed to decode ${account.pubkey.toString()}`)
        policies.push({
          id: 'decode_error',
          address: account.pubkey.toString(),
          policyholder: 'unknown',
          flightNumber: 'unknown',
          departureTime: 0,
          valid: false
        })
      }
    }

    const validPolicies = policies.filter(p => p.valid)
    console.log(`✅ Found ${validPolicies.length} valid policies out of ${policies.length} total`)
    
    return policies
  } catch (error) {
    console.error('❌ Failed to fetch on-chain policies:', error)
    return []
  }
}

async function fetchGitHubPolicies(): Promise<GitHubPolicy[]> {
  console.log('\n🔍 Scanning GitHub NFT metadata repository...')
  
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'xxxx') {
    console.log('❌ GitHub token not configured properly')
    console.log('   Please update GITHUB_TOKEN in your .env file')
    return []
  }
  
  if (!GITHUB_REPO) {
    console.log('❌ GitHub repo not configured')
    return []
  }

  const policies: GitHubPolicy[] = []
  
  try {
    console.log(`📡 Connecting to: ${GITHUB_REPO}`)
    
    // Get all wallet directories
    const walletsUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`
    const walletsResponse = await fetch(walletsUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!walletsResponse.ok) {
      const errorText = await walletsResponse.text()
      console.log(`❌ Failed to fetch GitHub data: ${walletsResponse.status} ${walletsResponse.statusText}`)
      console.log(`   Error: ${errorText}`)
      return []
    }

    const wallets = await walletsResponse.json()
    console.log(`📁 Found ${wallets.length} wallet directories`)
    
    for (const wallet of wallets) {
      if (wallet.type !== 'dir') continue
      
      console.log(`  📂 Scanning wallet: ${wallet.name.slice(0,8)}...`)
      
      // Get policy directories for this wallet
      const policiesResponse = await fetch(wallet.url, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      if (policiesResponse.ok) {
        const policyDirs = await policiesResponse.json()
        
        for (const policyDir of policyDirs) {
          if (policyDir.type !== 'dir') continue
          
          // Get files in policy directory
          const filesResponse = await fetch(policyDir.url, {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          })

          if (filesResponse.ok) {
            const files = await filesResponse.json()
            const hasMetadata = files.some((f: any) => f.name === 'policy.json')
            
            if (hasMetadata) {
              policies.push({
                policyId: policyDir.name,
                walletAddress: wallet.name,
                filePath: policyDir.path,
                sha: policyDir.sha
              })
              
              console.log(`    📄 Policy ${policyDir.name}`)
            }
          }
        }
      }
    }

    console.log(`✅ Found ${policies.length} policies in GitHub NFT repo`)
    return policies
    
  } catch (error) {
    console.error('❌ Failed to fetch GitHub policies:', error)
    return []
  }
}

async function fetchGitHubFlights(): Promise<FlightData[]> {
  console.log('\n🔍 Scanning GitHub flight metadata repository...')
  
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'xxxx' || !GITHUB_FLIGHT_REPO) {
    console.log('❌ GitHub flight repo not configured properly')
    return []
  }

  const flights: FlightData[] = []
  
  try {
    console.log(`📡 Connecting to: ${GITHUB_FLIGHT_REPO}`)
    
    // Get all flight directories
    const flightsUrl = `https://api.github.com/repos/${GITHUB_FLIGHT_REPO}/contents/flights?ref=${GITHUB_BRANCH}`
    const flightsResponse = await fetch(flightsUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!flightsResponse.ok) {
      const errorText = await flightsResponse.text()
      console.log(`❌ Failed to fetch flight data: ${flightsResponse.status} ${flightsResponse.statusText}`)
      console.log(`   Error: ${errorText}`)
      return []
    }

    const flightDirs = await flightsResponse.json()
    console.log(`📁 Found ${flightDirs.length} flight directories`)
    
    for (const flightDir of flightDirs) {
      if (flightDir.type !== 'dir') continue
      
      flights.push({
        flightNumber: flightDir.name,
        filePath: flightDir.path,
        sha: flightDir.sha
      })
      
      console.log(`  ✈️  Flight ${flightDir.name}`)
    }

    console.log(`✅ Found ${flights.length} flights in GitHub flight repo`)
    return flights
    
  } catch (error) {
    console.error('❌ Failed to fetch GitHub flights:', error)
    return []
  }
}

async function deleteGitHubPolicy(policy: GitHubPolicy): Promise<boolean> {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'xxxx' || !GITHUB_REPO) return false
  
  try {
    console.log(`🗑️  Deleting policy ${policy.policyId} from ${policy.walletAddress.slice(0,8)}...`)
    
    // Delete the entire policy directory by deleting all files in it
    const filesResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${policy.filePath}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!filesResponse.ok) return false
    
    const files = await filesResponse.json()
    let deletedCount = 0
    
    for (const file of files) {
      if (file.type === 'file') {
        const deleteResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${file.path}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `🧹 Delete orphaned policy ${policy.policyId} (no on-chain policy found)`,
            sha: file.sha,
            branch: GITHUB_BRANCH,
          }),
        })
        
        if (deleteResponse.ok) {
          deletedCount++
          console.log(`    ✅ Deleted ${file.name}`)
        } else {
          console.log(`    ❌ Failed to delete ${file.name}`)
        }
      }
    }
    
    return deletedCount > 0
  } catch (error) {
    console.error(`❌ Failed to delete policy ${policy.policyId}:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 ZYURA Enhanced Policy Sync Tool')
  console.log('='.repeat(60))
  
  // Debug environment loading
  console.log('🔧 Environment Configuration:')
  console.log(`  PROGRAM_ID: ${PROGRAM_ID.toString()}`)
  console.log(`  GITHUB_TOKEN: ${GITHUB_TOKEN ? (GITHUB_TOKEN === 'xxxx' ? 'NOT SET (still xxxx)' : 'SET') : 'NOT SET'}`)
  console.log(`  GITHUB_REPO: ${GITHUB_REPO || 'NOT SET'}`)
  console.log(`  GITHUB_FLIGHT_REPO: ${GITHUB_FLIGHT_REPO || 'NOT SET'}`)
  console.log(`  RPC_URL: ${RPC_URL}`)
  
  // Step 1: Fetch on-chain policies
  const onChainPolicies = await fetchOnChainPolicies()
  const validOnChainPolicies = onChainPolicies.filter(p => p.valid)
  const onChainPolicyIds = new Set(validOnChainPolicies.map(p => p.id))
  
  // Step 2: Fetch GitHub policies
  const gitHubPolicies = await fetchGitHubPolicies()
  const gitHubPolicyIds = new Set(gitHubPolicies.map(p => p.policyId))
  
  // Step 3: Fetch GitHub flights
  const gitHubFlights = await fetchGitHubFlights()
  const gitHubFlightNumbers = new Set(gitHubFlights.map(f => f.flightNumber))
  
  // Step 4: Analysis
  console.log('\n📊 COMPREHENSIVE ANALYSIS:')
  console.log('='.repeat(60))
  console.log(`  📋 On-chain policies (valid): ${validOnChainPolicies.length}`)
  console.log(`  📁 GitHub NFT policies: ${gitHubPolicies.length}`)
  console.log(`  ✈️  GitHub flight data: ${gitHubFlights.length}`)
  
  // Find orphaned GitHub policies (in repo but not on-chain)
  const orphanedGitHub = gitHubPolicies.filter(gh => !onChainPolicyIds.has(gh.policyId))
  
  // Find missing GitHub policies (on-chain but not in repo)
  const missingFromGitHub = validOnChainPolicies.filter(oc => !gitHubPolicyIds.has(oc.id))
  
  // Flight analysis
  const onChainFlights = new Set(validOnChainPolicies.map(p => p.flightNumber))
  const missingFlightData = Array.from(onChainFlights).filter(flight => !gitHubFlightNumbers.has(flight))
  const orphanedFlightData = gitHubFlights.filter(flight => !onChainFlights.has(flight.flightNumber))
  
  console.log('\n🔍 DETAILED FINDINGS:')
  console.log('='.repeat(60))
  console.log(`  🟢 Synced policies (on-chain + GitHub): ${validOnChainPolicies.length - missingFromGitHub.length}`)
  console.log(`  🔴 Orphaned GitHub policies: ${orphanedGitHub.length}`)
  console.log(`  🟡 Missing from GitHub: ${missingFromGitHub.length}`)
  console.log(`  ✈️  Missing flight data: ${missingFlightData.length}`)
  console.log(`  🗑️  Orphaned flight data: ${orphanedFlightData.length}`)
  
  if (orphanedGitHub.length > 0) {
    console.log('\n🗑️  ORPHANED GITHUB POLICIES (will be deleted):')
    orphanedGitHub.forEach(p => {
      console.log(`    Policy ${p.policyId} (${p.walletAddress.slice(0,8)}...)`)
    })
  }
  
  if (missingFromGitHub.length > 0) {
    console.log('\n📝 ON-CHAIN POLICIES MISSING FROM GITHUB:')
    missingFromGitHub.slice(0, 10).forEach(p => {
      console.log(`    Policy ${p.id}: ${p.flightNumber} (${p.policyholder.slice(0,8)}...)`)
    })
    if (missingFromGitHub.length > 10) {
      console.log(`    ... and ${missingFromGitHub.length - 10} more`)
    }
  }
  
  if (missingFlightData.length > 0) {
    console.log('\n✈️  FLIGHTS MISSING FROM GITHUB:')
    missingFlightData.forEach(flight => {
      console.log(`    Flight ${flight}`)
    })
  }
  
  if (orphanedFlightData.length > 0) {
    console.log('\n🗑️  ORPHANED FLIGHT DATA:')
    orphanedFlightData.forEach(flight => {
      console.log(`    Flight ${flight.flightNumber}`)
    })
  }
  
  // Step 5: Execute cleanup if confirmed
  const shouldDelete = process.argv.includes('--delete')
  
  if (orphanedGitHub.length > 0) {
    if (!shouldDelete) {
      console.log('\n⚠️  TO DELETE ORPHANED GITHUB POLICIES:')
      console.log('npm run sync-improved -- --delete')
    } else {
      console.log('\n🧹 DELETING ORPHANED GITHUB POLICIES...')
      
      let deletedCount = 0
      for (const policy of orphanedGitHub) {
        const success = await deleteGitHubPolicy(policy)
        if (success) {
          deletedCount++
        }
      }
      
      console.log(`\n✅ Deleted ${deletedCount} orphaned policies`)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 FINAL SUMMARY:')
  console.log(`  ✅ Valid on-chain policies: ${validOnChainPolicies.length}`)
  console.log(`  📁 GitHub NFT policies: ${gitHubPolicies.length}`)
  console.log(`  ✈️  GitHub flight data: ${gitHubFlights.length}`)
  console.log(`  🧹 Orphaned policies ${shouldDelete ? 'deleted' : 'found'}: ${orphanedGitHub.length}`)
  console.log(`  📝 Missing from GitHub: ${missingFromGitHub.length}`)
  console.log(`  ✈️  Missing flight data: ${missingFlightData.length}`)
  
  if (missingFromGitHub.length > 0) {
    console.log('\n💡 NOTE: Missing policies will be automatically added to GitHub')
    console.log('    when users interact with them through the dashboard.')
  }
  
  if (GITHUB_TOKEN === 'xxxx') {
    console.log('\n⚠️  IMPORTANT: Update your GitHub token in .env to enable full functionality!')
  }
}

main().catch((error) => {
  console.error('❌ Sync failed:', error)
  process.exit(1)
})
