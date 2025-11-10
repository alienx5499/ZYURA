import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const idlJson = require('../src/idl/zyura.json');

// Must be set in environment variables
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
if (!process.env.PROGRAM_ID) {
  throw new Error("PROGRAM_ID environment variable is required");
}
const RPC_URL = process.env.SOLANA_RPC || clusterApiUrl('devnet');
const connection = new Connection(RPC_URL, 'confirmed');

async function listAllPolicies() {
  try {
    console.log(`\n🔍 Fetching all policies from devnet...`);
    console.log(`Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`RPC URL: ${RPC_URL}\n`);

    const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
    const disc = coder.accounts.accountDiscriminator('Policy');
    
    console.log('Searching for Policy accounts...\n');
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } }
      ],
      commitment: 'confirmed'
    });

    console.log(`Found ${accounts.length} policy account(s)\n`);

    if (accounts.length === 0) {
      console.log('No policies found on devnet.');
      return;
    }

    const policies: Array<{
      policyId: string;
      policyholder: string;
      flightNumber: string;
      premiumPaid: string;
      status: string;
      coverageAmount?: string;
      departureTime?: number;
      paidAt?: number | null;
      account: string;
    }> = [];

    for (const acc of accounts) {
      try {
        const decoded: any = coder.accounts.decode('Policy', acc.account.data);
        
        const policyId = decoded.id ? decoded.id.toString() : 'N/A';
        const policyholder = decoded.policyholder ? new PublicKey(decoded.policyholder).toString() : 'N/A';
        const flightNumber = decoded.flight_number || 'N/A';
        const premiumPaid = decoded.premium_paid ? decoded.premium_paid.toString() : '0';
        const coverageAmount = decoded.coverage_amount ? decoded.coverage_amount.toString() : undefined;
        const departureTime = decoded.departure_time ? Number(decoded.departure_time) : undefined;
        const paidAt = decoded.paid_at ? Number(decoded.paid_at) : null;
        
        let status = 'Unknown';
        if (decoded.status) {
          // Anchor enum can be decoded as an object with the variant name as a key
          if (decoded.status.Active !== undefined || decoded.status.active !== undefined) {
            status = 'Active';
          } else if (decoded.status.PaidOut !== undefined || decoded.status.paidOut !== undefined) {
            status = 'PaidOut';
          } else if (decoded.status.Expired !== undefined || decoded.status.expired !== undefined) {
            status = 'Expired';
          } else if (typeof decoded.status === 'string') {
            status = decoded.status;
          } else {
            // Try to find any key in the status object
            const keys = Object.keys(decoded.status);
            if (keys.length > 0) {
              status = keys[0];
            }
          }
        }

        policies.push({
          policyId,
          policyholder,
          flightNumber,
          premiumPaid,
          status,
          coverageAmount,
          departureTime,
          paidAt,
          account: acc.pubkey.toString()
        });
      } catch (err) {
        console.error(`Error decoding policy at ${acc.pubkey.toString()}:`, err);
      }
    }

    policies.sort((a, b) => Number(a.policyId) - Number(b.policyId));

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    POLICY SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    policies.forEach((policy, index) => {
      console.log(`Policy #${index + 1}:`);
      console.log(`  Policy ID:      ${policy.policyId}`);
      console.log(`  Account:        ${policy.account}`);
      console.log(`  Policyholder:   ${policy.policyholder}`);
      console.log(`  Flight Number:  ${policy.flightNumber}`);
      console.log(`  Status:         ${policy.status}`);
      console.log(`  Premium Paid:   ${(Number(policy.premiumPaid) / 1e6).toFixed(6)} USDC`);
      if (policy.coverageAmount) {
        console.log(`  Coverage:       ${(Number(policy.coverageAmount) / 1e6).toFixed(6)} USDC`);
      }
      if (policy.departureTime) {
        const depDate = new Date(policy.departureTime * 1000);
        console.log(`  Departure:      ${depDate.toISOString()}`);
      }
      if (policy.paidAt) {
        const paidDate = new Date(policy.paidAt * 1000);
        console.log(`  Paid At:        ${paidDate.toISOString()}`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Policies: ${policies.length}`);
    console.log(`Active: ${policies.filter(p => p.status === 'Active').length}`);
    console.log(`PaidOut: ${policies.filter(p => p.status === 'PaidOut').length}`);
    console.log(`Expired: ${policies.filter(p => p.status === 'Expired').length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('Error fetching policies:', error);
    process.exit(1);
  }
}

listAllPolicies();

