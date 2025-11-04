/*
  Quick script to check a policy's status
  Usage: POLICY_ADDRESS=4RrMcH3de4jUzgzp2D9WmincwBxc7JenScsBPWcpQhCp tsx scripts/check-policy.ts
*/

import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Connection } from '@solana/web3.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const idlJson = require('../src/idl/zyura.json')

const POLICY_ADDRESS = process.env.POLICY_ADDRESS || '4RrMcH3de4jUzgzp2D9WmincwBxc7JenScsBPWcpQhCp'
const RPC_URL = process.env.SOLANA_RPC || 'https://api.devnet.solana.com'

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl)
  const policyPubkey = new PublicKey(POLICY_ADDRESS)

  const info = await connection.getAccountInfo(policyPubkey)
  if (!info) {
    console.log('❌ Policy not found at:', POLICY_ADDRESS)
    return
  }

  const decoded: any = coder.accounts.decode('Policy', info.data)
  console.log('📋 Policy Details (Raw):')
  console.log('  Decoded object keys:', Object.keys(decoded))
  console.log('  Full decoded:', JSON.stringify(decoded, (k, v) => {
    if (v && typeof v === 'object' && v.constructor && v.constructor.name === 'BN') {
      return v.toString()
    }
    if (v && typeof v === 'object' && v._bn) {
      return v._bn.toString()
    }
    return v
  }, 2))
  console.log('\n📋 Policy Details (Formatted):')
  console.log('  ID:', decoded.id?.toString?.() || decoded.id?._bn?.toString() || decoded.id)
  console.log('  Policyholder:', decoded.policyholder?.toString?.() || decoded.policyholder)
  console.log('  Product ID:', decoded.productId?.toString?.() || decoded.productId?._bn?.toString() || decoded.productId)
  console.log('  Flight:', decoded.flightNumber)
  console.log('  Departure Time:', decoded.departureTime ? new Date(Number(decoded.departureTime?.toString?.() || decoded.departureTime?._bn?.toString() || decoded.departureTime) * 1000).toISOString() : 'N/A')
  console.log('  Status:', JSON.stringify(decoded.status, null, 2))
  console.log('  Premium Paid:', decoded.premiumPaid?.toString?.() || decoded.premiumPaid?._bn?.toString() || decoded.premiumPaid)
  console.log('  Coverage Amount:', decoded.coverageAmount?.toString?.() || decoded.coverageAmount?._bn?.toString() || decoded.coverageAmount)
  console.log('\n🔍 Status Check:')
  console.log('  Is Active:', decoded.status?.Active !== undefined)
  console.log('  Is PaidOut:', decoded.status?.PaidOut !== undefined)
  console.log('  Is Expired:', decoded.status?.Expired !== undefined)
}

main().catch(console.error)

