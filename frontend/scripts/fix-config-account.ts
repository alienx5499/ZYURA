import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const USDC_MINT = new PublicKey("4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f");

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

async function main() {
  console.log("Config Account Migration Script\n");
  
  // First, check what admin is in the Config account
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  
  const accountInfo = await connection.getAccountInfo(configPda);
  if (accountInfo && accountInfo.data.length === 138) {
    // Extract admin from old structure
    const oldAdminBytes = accountInfo.data.slice(8, 40);
    const oldAdmin = new PublicKey(oldAdminBytes);
    console.log("Current Config admin address:", oldAdmin.toString());
    console.log("\nYou need to provide the keypair for this admin address to migrate.");
  }
  
  // Load admin keypair
  const keypairPath = process.env.ADMIN_KEYPAIR_PATH || 
                      path.join(process.env.HOME || process.env.USERPROFILE || "", ".config/solana/phantom-devnet.json") ||
                      path.join(__dirname, "../zyura-keypair.json");
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`\n❌ Keypair file not found: ${keypairPath}`);
    console.error("\nPlease provide the admin keypair:");
    console.error("1. Set ADMIN_KEYPAIR_PATH environment variable");
    console.error("2. Or place keypair at: ~/.config/solana/phantom-devnet.json");
    console.error("3. Or place keypair at: frontend/zyura-keypair.json");
    if (accountInfo && accountInfo.data.length === 138) {
      console.error(`\nThe keypair must match admin address: ${oldAdmin.toString()}`);
    }
    process.exit(1);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Admin wallet:", adminKeypair.publicKey.toString());
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Load IDL
  const idlPath = path.join(__dirname, "../src/idl/zyura.json");
  const idlJson = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  const program = new anchor.Program(idlJson as anchor.Idl, PROGRAM_ID, {
    connection,
    wallet: new anchor.Wallet(adminKeypair),
  });
  
  // Derive Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  
  console.log("Config PDA:", configPda.toString());
  
  // Check if Config account exists and its size
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    console.log("\n✓ Config account doesn't exist. Initializing...");
    await initializeConfig(program, configPda);
    return;
  }
  
  console.log("\nConfig account size:", accountInfo.data.length, "bytes");
  
  if (accountInfo.data.length === 106) {
    console.log("✓ Config account already has the correct structure (106 bytes). No migration needed.");
    return;
  }
  
  if (accountInfo.data.length === 138) {
    console.log("Config account has OLD structure (138 bytes with risk_pool_vault)");
    console.log("\nExtracting old values...");
    
    // Extract old values
    const oldAdminBytes = accountInfo.data.slice(8, 40);
    const oldUsdcMintBytes = accountInfo.data.slice(40, 72);
    const oldSwitchboardBytes = accountInfo.data.slice(72, 104);
    const oldPaused = accountInfo.data[136] === 1;
    
    const oldAdmin = new PublicKey(oldAdminBytes);
    const oldUsdcMint = new PublicKey(oldUsdcMintBytes);
    const oldSwitchboardProgram = new PublicKey(oldSwitchboardBytes);
    
    console.log("  Old Admin:", oldAdmin.toString());
    console.log("  Old USDC Mint:", oldUsdcMint.toString());
    console.log("  Old Switchboard Program:", oldSwitchboardProgram.toString());
    console.log("  Old Paused:", oldPaused);
    
    // Verify admin matches
    if (!oldAdmin.equals(adminKeypair.publicKey)) {
      console.error(`\n❌ Admin mismatch!`);
      console.error(`  Expected: ${adminKeypair.publicKey.toString()}`);
      console.error(`  Actual: ${oldAdmin.toString()}`);
      console.error("\nPlease use the correct admin keypair.");
      process.exit(1);
    }
    
    console.log("\n✓ Admin keypair matches. Proceeding with migration...\n");
    
    // Step 1: Close the old Config account
    console.log("Step 1: Closing old Config account...");
    try {
      const closeTx = await program.methods
        .closeConfig()
        .accounts({
          config: configPda,
          admin: adminKeypair.publicKey,
        })
        .rpc();
      
      console.log("  Close transaction:", closeTx);
      await connection.confirmTransaction(closeTx);
      console.log("  ✓ Old Config account closed");
    } catch (err: any) {
      console.error("  ❌ Failed to close Config account:", err.message);
      if (err.message?.includes("AccountDiscriminatorMismatch")) {
        console.error("\nThe contract doesn't have the close_config instruction yet.");
        console.error("Please build and deploy the contract first:");
        console.error("  cd contracts && anchor build && anchor deploy");
        process.exit(1);
      }
      throw err;
    }
    
    // Step 2: Reinitialize with new structure
    console.log("\nStep 2: Reinitializing Config account with new structure...");
    await initializeConfig(program, configPda);
    
    console.log("\nMigration complete! Config account now has the correct structure.");
  } else {
    console.error(`\n❌ Unexpected Config account size: ${accountInfo.data.length} bytes`);
    console.error("Expected: 106 bytes (new) or 138 bytes (old)");
    process.exit(1);
  }
}

async function initializeConfig(program: anchor.Program, configPda: PublicKey) {
  const tx = await program.methods
    .initialize(program.provider.wallet.publicKey, USDC_MINT, SWITCHBOARD_PROGRAM_ID)
    .accounts({
      config: configPda,
      payer: program.provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log("  Initialize transaction:", tx);
  await program.provider.connection.confirmTransaction(tx);
  console.log("  ✓ Config account initialized");
}

main().catch(console.error);

