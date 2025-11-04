import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const idlJson = require('../src/idl/zyura.json');

const PROGRAM_ID = new PublicKey('H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function findPayoutTx() {
  const policyId = new BN(281097);
  const [policyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('policy'), policyId.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );

  console.log('Policy PDA:', policyPda.toBase58());
  console.log('Fetching recent transactions...\n');

  const sigs = await connection.getSignaturesForAddress(policyPda, { limit: 20 });
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
  
  for (const sigInfo of sigs) {
    try {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });
      
      if (!tx || !tx.transaction || tx.meta?.err) continue;
      
      console.log('Transaction:', sigInfo.signature);
      console.log('  Block time:', sigInfo.blockTime ? new Date(sigInfo.blockTime * 1000).toISOString() : 'N/A');
      console.log('  Instructions:', tx.transaction.message.instructions.length);
      
      // Check instructions
      for (const ix of tx.transaction.message.instructions) {
        if ('programId' in ix && ix.programId.equals(PROGRAM_ID)) {
          console.log('  Found program instruction!');
          try {
            const decoded = coder.instruction.decode(ix.data);
            console.log('  Decoded instruction:', decoded);
            if (decoded && (decoded.name === 'processPayout' || decoded.name === 'process_payout')) {
              console.log('\n✅ FOUND PAYOUT TRANSACTION:', sigInfo.signature);
              return sigInfo.signature;
            }
          } catch (e) {
            console.log('  Could not decode instruction:', e.message);
            // Show first 8 bytes (discriminator)
            const data = 'data' in ix ? Buffer.from(ix.data) : Buffer.alloc(0);
            console.log('  Instruction data (first 8 bytes):', data.slice(0, 8).toString('hex'));
          }
        }
      }
      
      // Check for token transfers
      if (tx.meta?.postTokenBalances && tx.meta.postTokenBalances.length > 0) {
        console.log('  Has token balances:', tx.meta.postTokenBalances.length);
      }
      console.log('');
    } catch (e) {
      console.error('Error processing:', sigInfo.signature, e);
    }
  }
  
  console.log('No payout transaction found');
}

findPayoutTx().catch(console.error);

