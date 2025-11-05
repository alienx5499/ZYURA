import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const USDC_MINT = new PublicKey("4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f"); // Default Switchboard devnet program

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

async function main() {
  // Load admin keypair
  const keypairPath = process.env.ADMIN_KEYPAIR_PATH || path.join(__dirname, "../zyura-keypair.json");
  if (!fs.existsSync(keypairPath)) {
    console.error(`Keypair file not found: ${keypairPath}`);
    console.error("Please set ADMIN_KEYPAIR_PATH or place keypair at frontend/zyura-keypair.json");
    process.exit(1);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Admin wallet:", adminKeypair.publicKey.toString());
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Derive Config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  
  console.log("Config PDA:", configPda.toString());
  
  // Check if Config account exists
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    console.log("Config account doesn't exist. Initializing...");
    await initializeConfig(connection, adminKeypair, configPda, configBump);
  } else {
    console.log("Config account exists. Closing and reinitializing...");
    
    // Close the account (transfer lamports back to admin)
    const lamports = await connection.getBalance(configPda);
    console.log("Config account lamports:", lamports);
    
    if (lamports > 0) {
      // Close account by transferring lamports to admin
      const closeTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: configPda,
          toPubkey: adminKeypair.publicKey,
          lamports: lamports - 5000, // Keep some for rent exemption during close
        })
      );
      
      // Note: We can't sign from a PDA, so we need to use the program's upgrade authority
      // or close it via the program itself. For now, let's just reinitialize.
      console.log("⚠️  Cannot directly close PDA. Please use the program's upgrade authority or reinitialize.");
      console.log("Attempting to reinitialize (this will fail if account exists with wrong structure)...");
    }
    
    // Try to initialize anyway (will fail if account exists)
    try {
      await initializeConfig(connection, adminKeypair, configPda, configBump);
    } catch (err: any) {
      if (err.message?.includes("already in use")) {
        console.error("\n❌ Config account exists with wrong structure!");
        console.error("You need to:");
        console.error("1. Use the program's upgrade authority to close the account");
        console.error("2. OR redeploy the contract with a migration instruction");
        console.error("3. OR contact the admin to close and reinitialize");
        process.exit(1);
      }
      throw err;
    }
  }
  
  console.log("\n✓ Config account initialized successfully!");
}

async function initializeConfig(
  connection: Connection,
  adminKeypair: Keypair,
  configPda: PublicKey,
  configBump: number
) {
  // Load IDL
  const idlPath = path.join(__dirname, "../src/idl/zyura.json");
  const idlJson = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  const program = new anchor.Program(idlJson as anchor.Idl, PROGRAM_ID, {
    connection,
    wallet: new anchor.Wallet(adminKeypair),
  });
  
  const tx = await program.methods
    .initialize(adminKeypair.publicKey, USDC_MINT, SWITCHBOARD_PROGRAM_ID)
    .accounts({
      config: configPda,
      payer: adminKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log("Initialize transaction:", tx);
  await connection.confirmTransaction(tx);
}

main().catch(console.error);

