import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const PROGRAM_ID = new PublicKey("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Derive Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  
  console.log("Config PDA:", configPda.toString());
  
  // Get account info
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    console.error("Config account not found!");
    return;
  }
  
  console.log("\nAccount size:", accountInfo.data.length, "bytes");
  console.log("Account data (hex):", accountInfo.data.slice(0, 100).toString("hex"));
  
  // Try to decode with current structure
  // Current structure: admin (32) + usdc_mint (32) + switchboard_program (32) + paused (1) + bump (1) = 98 bytes
  // Plus 8 bytes discriminator = 106 bytes total
  
  // Old structure (with risk_pool_vault): admin (32) + usdc_mint (32) + switchboard_program (32) + risk_pool_vault (32) + paused (1) + bump (1) = 130 bytes
  // Plus 8 bytes discriminator = 138 bytes total
  
  console.log("\nExpected size (current): 106 bytes (8 discriminator + 98 data)");
  console.log("Expected size (old with vault): 138 bytes (8 discriminator + 130 data)");
  console.log("Actual size:", accountInfo.data.length, "bytes");
  
  if (accountInfo.data.length === 138) {
    console.log("\n⚠️  Config account has OLD structure (with risk_pool_vault)");
    console.log("You need to close and reinitialize the Config account.");
  } else if (accountInfo.data.length === 106) {
    console.log("\n✓ Config account has CURRENT structure");
    // Try to decode
    try {
      const adminBytes = accountInfo.data.slice(8, 40);
      const usdcMintBytes = accountInfo.data.slice(40, 72);
      const switchboardBytes = accountInfo.data.slice(72, 104);
      const paused = accountInfo.data[104] === 1;
      const bump = accountInfo.data[105];
      
      console.log("\nDecoded Config:");
      console.log("  Admin:", new PublicKey(adminBytes).toString());
      console.log("  USDC Mint:", new PublicKey(usdcMintBytes).toString());
      console.log("  Switchboard Program:", new PublicKey(switchboardBytes).toString());
      console.log("  Paused:", paused);
      console.log("  Bump:", bump);
    } catch (err) {
      console.error("Failed to decode:", err);
    }
  } else {
    console.log("\n⚠️  Config account size doesn't match expected structures!");
  }
}

main().catch(console.error);

