/*
  Script to update existing policy metadata with payout transaction signature
  Usage:
    GITHUB_TOKEN=your_token \
    POLICY_ID=281097 \
    PAYOUT_TX_SIG=38jxFSJJU3QAc3DbPwMfz7eAQY9M6U9yJesoSiLHcAN8wPNisPcbwqywEoB8ZgCqxx8q4R2u4u4qPSatFARvGwjB \
    POLICYHOLDER=HwrjaPLqsq3YuR6cuK93oNtpGSsXoUtQ4oY9GwuYf2Vy \
    tsx scripts/update-payout-tx.ts
*/

import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import BN from 'bn.js'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO || 'alienx5499/zyura-nft-metadata'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const POLICY_ID = process.env.POLICY_ID
const PAYOUT_TX_SIG = process.env.PAYOUT_TX_SIG
const POLICYHOLDER = process.env.POLICYHOLDER

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN is required')
  process.exit(1)
}

if (!POLICY_ID || !PAYOUT_TX_SIG || !POLICYHOLDER) {
  console.error('❌ POLICY_ID, PAYOUT_TX_SIG, and POLICYHOLDER are required')
  process.exit(1)
}

async function updatePayoutTx() {
  try {
    const wallet = new PublicKey(POLICYHOLDER).toBase58()
    const policyIdStr = POLICY_ID
    
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
        console.log(`Found metadata at: ${path}`)
        break
      }
    }

    if (!metadata) {
      console.error(`❌ Metadata not found for policy ${policyIdStr}`)
      console.log('Tried paths:', possiblePaths)
      process.exit(1)
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
      value: PAYOUT_TX_SIG
    })

    // Also add as top-level field for easy access
    metadata.payout_transaction = PAYOUT_TX_SIG
    metadata.payout_tx_sig = PAYOUT_TX_SIG
    metadata.paid_at = new Date().toISOString()

    // Update the file
    const contentBase64 = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8').toString('base64')
    const uploadUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${metadataUrl}`
    const body: any = {
      message: `Update policy ${policyIdStr} metadata with payout transaction ${PAYOUT_TX_SIG}`,
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
      process.exit(1)
    }

    const result = await putRes.json()
    console.log(`Successfully updated metadata with payout transaction`)
    console.log(`   Policy ID: ${policyIdStr}`)
    console.log(`   Payout TX: ${PAYOUT_TX_SIG}`)
    console.log(`   File: ${metadataUrl}`)
    console.log(`   Commit: ${result.commit?.sha}`)
  } catch (err: any) {
    console.error(`❌ Error:`, err?.message || err)
    process.exit(1)
  }
}

updatePayoutTx()

