/*
  Usage:
  pnpm ts-node --transpile-only frontend/scripts/migrate_policies.ts \
    --wallet HwrjaPLqsq3YuR6cuK93oNtpGSsXoUtQ4oY9GwuYf2Vy \
    --repo /Users/prabalpatra/Developer/TURBIN3/Capstone/ZYURA/zyura-nft-metadata \
    --rpc https://api.devnet.solana.com
*/

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection } from '@solana/web3.js';

type Args = { wallet: string; repo: string; rpc?: string; program?: string; overwriteSvgs?: boolean };

function parseArgs(): Args {
  const out: any = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--wallet') out.wallet = process.argv[++i];
    else if (a === '--repo') out.repo = process.argv[++i];
    else if (a === '--rpc') out.rpc = process.argv[++i];
    else if (a === '--program') out.program = process.argv[++i];
    else if (a === '--overwrite-svgs') out.overwriteSvgs = true;
  }
  if (!out.wallet || !out.repo) {
    console.error('Missing required args. Example: --wallet <pubkey> --repo <path> [--rpc <url>]');
    process.exit(1);
  }
  return out as Args;
}

async function pathExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

function toUsd(value6dp: number): string {
  return (value6dp / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function readPnrFromJson(jsonPath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    const j = JSON.parse(raw);
    if (Array.isArray(j.attributes)) {
      const p = j.attributes.find((a: any) => (a?.trait_type || a?.traitType) === 'PNR');
      if (p && (p.value || p.val)) return String(p.value || p.val);
    }
  } catch {}
  return undefined;
}

async function main() {
  const { wallet, repo, rpc, program, overwriteSvgs } = parseArgs();
  const walletPk = new PublicKey(wallet);
  const rpcUrl = rpc || process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load IDL JSON directly from file to avoid TS path/ESM issues
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const idlPath = path.resolve(__dirname, '../src/idl/zyura.json');
  const idlRaw = await fs.readFile(idlPath, 'utf8');
  const idlJson = JSON.parse(idlRaw);
  const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
  const programId = new PublicKey(program || 'H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX');

  const disc = coder.accounts.accountDiscriminator('Policy');
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [{ memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } }]
  });

  const myPolicies: any[] = [];
  for (const a of accounts) {
    try {
      const decoded: any = coder.accounts.decode('Policy', a.account.data);
      const holder = new PublicKey(decoded.policyholder).toBase58();
      if (holder === wallet) myPolicies.push(decoded);
    } catch {}
  }

  if (myPolicies.length === 0) {
    console.log('No policies found for wallet:', wallet);
    return;
  }

  console.log('Found policies:', myPolicies.length);

  for (const p of myPolicies) {
    const policyId = Number((p.id ?? 0).toString());
    const productId = Number((p.product_id ?? 0).toString());
    const flight = (p.flight_number ?? '').toString();
    const dep = Number((p.departure_time ?? 0).toString());
    const coverage6 = Number((p.coverage_amount ?? 0).toString());
    const premium6 = Number((p.premium_paid ?? 0).toString());
    const depIso = dep ? new Date(dep * 1000).toISOString() : '';

    const folder = path.join(repo, 'metadata', wallet, String(policyId));
    const legacyJson = path.join(repo, 'metadata', wallet, `policy-${policyId}.json`);
    const legacySvg = path.join(repo, 'metadata', wallet, `policy-${policyId}.svg`);
    const jsonPath = path.join(folder, 'policy.json');
    const svgPath = path.join(folder, 'policy.svg');

    await fs.mkdir(folder, { recursive: true });

    // Move legacy JSON if present
    if (!(await pathExists(jsonPath))) {
      if (await pathExists(legacyJson)) {
        await fs.rename(legacyJson, jsonPath);
      } else {
        // Create fresh JSON from on-chain data
        const rawUrl = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${wallet}/${policyId}/policy.svg`;
        const json = {
          name: `ZYURA Policy ${policyId} ${flight || ''}`.trim(),
          symbol: 'ZYURA',
          image: rawUrl,
          attributes: [
            { trait_type: 'Product ID', value: String(productId) },
            { trait_type: 'Policy ID', value: String(policyId) },
            { trait_type: 'Flight', value: flight || '—' },
            { trait_type: 'Departure', value: depIso || '—' },
            { trait_type: 'Premium (6dp)', value: String(premium6) },
            { trait_type: 'Coverage (6dp)', value: String(coverage6) },
            { trait_type: 'Wallet Address', value: wallet }
          ]
        };
        await fs.writeFile(jsonPath, JSON.stringify(json, null, 2), 'utf8');
      }
    }

    // Move legacy SVG if present; otherwise or if overwrite, generate from official template
    if (overwriteSvgs || !(await pathExists(svgPath))) {
      if (!overwriteSvgs && (await pathExists(legacySvg))) {
        await fs.rename(legacySvg, svgPath);
      } else {
        const templatePath = path.resolve(__dirname, '../public/zyura-nft-insurance.svg');
        let tpl = await fs.readFile(templatePath, 'utf8');
        const premiumUsd = toUsd(premium6);
        const coverageUsd = toUsd(coverage6);
        const pnrFromJson = await readPnrFromJson(jsonPath);
        tpl = tpl
          .replaceAll('[FLIGHT_NUMBER]', flight || '—')
          .replaceAll('[POLICY_ID]', String(policyId))
          .replaceAll('[PRODUCT_ID]', String(productId))
          .replaceAll('[DEPARTURE_ISO]', depIso || '—')
          .replaceAll('[PREMIUM_6DP]', premiumUsd)
          .replaceAll('[COVERAGE_6DP]', coverageUsd)
          .replaceAll('[PNR]', pnrFromJson || 'N/A');
        await fs.writeFile(svgPath, tpl, 'utf8');
      }
    }

    // Ensure JSON image points to new path
    try {
      const jRaw = await fs.readFile(jsonPath, 'utf8');
      const j = JSON.parse(jRaw);
      const expected = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${wallet}/${policyId}/policy.svg`;
      if (j.image !== expected) {
        j.image = expected;
        await fs.writeFile(jsonPath, JSON.stringify(j, null, 2), 'utf8');
      }
    } catch {}

    console.log(`✔ Migrated policy ${policyId} → ${path.relative(repo, folder)}`);
  }

  console.log('Done. Commit and push changes from the metadata repo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


