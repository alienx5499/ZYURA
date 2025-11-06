import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync, createCloseAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "./setup";

export async function batchCleanup(ctx: TestContext): Promise<void> {
  const isDevnet = ctx.provider.connection.rpcEndpoint.includes('devnet');
  if (!isDevnet || !ctx.isAdminAuthorized) {
    console.log("Skipping cleanup: not devnet or no admin access");
    return;
  }

  console.log("\n=== Batch Cleanup: Reclaiming SOL from test accounts ===");
  
  try {
    const cleanupPromises: Promise<void>[] = [];

    const closeTokenAccount = async (account: PublicKey, owner: Keypair, name: string) => {
      try {
        const tokenAccount = await getAccount(ctx.provider.connection, account);
        if (tokenAccount.amount === BigInt(0)) {
          const closeIx = createCloseAccountInstruction(account, owner.publicKey, owner.publicKey, []);
          const tx = new anchor.web3.Transaction().add(closeIx);
          await ctx.provider.sendAndConfirm(tx, [owner]);
          console.log(`✓ ${name} closed`);
        } else {
          console.log(`⚠ ${name} has ${tokenAccount.amount.toString()} tokens, skipping`);
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes("Account does not exist") && !errorMsg.includes("TokenAccountNotFoundError")) {
          console.log(`✗ Could not close ${name}: ${errorMsg}`);
        }
      }
    };

    const closeConfig = async () => {
      try {
        const configInfo = await ctx.provider.connection.getAccountInfo(ctx.configAccount);
        if (configInfo) {
          await ctx.program.methods.closeConfig().accounts({
            config: ctx.configAccount,
            admin: ctx.admin.publicKey,
          }).signers([ctx.admin]).rpc();
          console.log("✓ Config account closed");
        }
      } catch (error: any) {
        if (!error.message?.includes("Account does not exist")) {
          console.log(`✗ Could not close config: ${error.message}`);
        }
      }
    };

    await closeConfig();

    const userUsdcAta = getAssociatedTokenAddressSync(ctx.usdcMint, ctx.user.publicKey);
    const lpUsdcAta = getAssociatedTokenAddressSync(ctx.usdcMint, ctx.liquidityProvider.publicKey);
    
    cleanupPromises.push(closeTokenAccount(userUsdcAta, ctx.user, "User USDC account"));
    cleanupPromises.push(closeTokenAccount(lpUsdcAta, ctx.liquidityProvider, "LP USDC account"));
    cleanupPromises.push(closeTokenAccount(ctx.riskPoolVault, ctx.admin, "Risk pool vault"));

    await Promise.all(cleanupPromises);

    console.log("=== Batch cleanup complete ===\n");
  } catch (error: any) {
    console.log(`Error during batch cleanup: ${error.message}`);
  }
}

