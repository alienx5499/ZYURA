import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX");
const USDC_MINT = new PublicKey("4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f");

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

async function main() {
  console.log("⚠️  Config account migration script");
  console.log("This script will close the old Config account and reinitialize it with the new structure.\n");
  
  // Load deployer/upgrade authority keypair
  const keypairPath = process.env.DEPLOYER_KEYPAIR_PATH || path.join(__dirname, "../../target/deploy/zyura-keypair.json");
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Keypair file not found: ${keypairPath}`);
    console.error("\nPlease provide the program upgrade authority keypair:");
    console.error("1. Set DEPLOYER_KEYPAIR_PATH environment variable");
    console.error("2. Or place keypair at: contracts/target/deploy/zyura-keypair.json");
    console.error("\nAlternatively, you can manually:");
    console.error("1. Close the Config account using solana CLI");
    console.error("2. Reinitialize using the initialize instruction");
    process.exit(1);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const deployerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Deployer/Upgrade Authority:", deployerKeypair.publicKey.toString());
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Check program upgrade authority
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (!programInfo) {
    console.error("Program not found!");
    process.exit(1);
  }
  
  const programData = await connection.getAccountInfo(programInfo.owner);
  // Program upgrade authority is stored in the program data account
  // For now, we'll try to use the deployer keypair
  
  // Derive Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  
  console.log("Config PDA:", configPda.toString());
  
  // Read old Config data
  const oldAccountInfo = await connection.getAccountInfo(configPda);
  if (!oldAccountInfo) {
    console.log("Config account doesn't exist. Nothing to migrate.");
    return;
  }
  
  if (oldAccountInfo.data.length === 106) {
    console.log("✓ Config account already has the new structure. No migration needed.");
    return;
  }
  
  console.log("\nOld Config account size:", oldAccountInfo.data.length, "bytes");
  
  // Extract admin from old structure
  // Old structure: discriminator (8) + admin (32) + usdc_mint (32) + switchboard_program (32) + risk_pool_vault (32) + paused (1) + bump (1)
  const oldAdminBytes = oldAccountInfo.data.slice(8, 40);
  const oldUsdcMintBytes = oldAccountInfo.data.slice(40, 72);
  const oldSwitchboardBytes = oldAccountInfo.data.slice(72, 104);
  const oldPaused = oldAccountInfo.data[136] === 1;
  const oldBump = oldAccountInfo.data[137];
  
  const oldAdmin = new PublicKey(oldAdminBytes);
  const oldUsdcMint = new PublicKey(oldUsdcMintBytes);
  const oldSwitchboardProgram = new PublicKey(oldSwitchboardBytes);
  
  console.log("\nOld Config values:");
  console.log("  Admin:", oldAdmin.toString());
  console.log("  USDC Mint:", oldUsdcMint.toString());
  console.log("  Switchboard Program:", oldSwitchboardProgram.toString());
  console.log("  Paused:", oldPaused);
  console.log("  Bump:", oldBump);
  
  console.log("\n⚠️  IMPORTANT: Closing the Config account will:");
  console.log("  - Transfer lamports back to the program");
  console.log("  - Lose all existing data");
  console.log("  - Require reinitialization");
  console.log("\nProceeding with migration...\n");
  
  // Close account by transferring lamports to program
  // Note: We can't directly close a PDA from outside the program
  // We need to either:
  // 1. Use the program's upgrade authority to redeploy with a close instruction
  // 2. Manually close using solana CLI
  // 3. Create a migration instruction in the program
  
  // For now, let's try to close it by creating a transaction that the program can execute
  // Actually, we can't close a PDA from outside. We need to use the program itself.
  
  console.log("❌ Cannot directly close a PDA account from outside the program.");
  console.log("\nOptions to fix this:");
  console.log("1. Add a 'close_config' instruction to the program (requires program upgrade)");
  console.log("2. Use the program's upgrade authority to close the account");
  console.log("3. Manually close using: solana program close <config_pda>");
  console.log("4. Redeploy the contract (this will lose all data)");
  
  console.log("\n💡 Quick fix: Add a temporary 'close_config' instruction to the contract");
  console.log("   Then run this script again after redeploying.");
}

main().catch(console.error);

