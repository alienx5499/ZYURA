import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext, SWITCHBOARD_PROGRAM_ID } from "./setup";

describe("Initialization", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  it("Initializes the ZYURA protocol", async () => {
    try {
      const existingConfig = await ctx.program.account.config.fetch(ctx.configAccount);
      if (existingConfig.admin.toString() === ctx.admin.publicKey.toString()) {
        expect(existingConfig.admin.toString()).to.equal(ctx.admin.publicKey.toString());
        expect(existingConfig.usdcMint.toString()).to.equal(ctx.usdcMint.toString());
        expect(existingConfig.paused).to.be.false;
        return;
      } else {
        if (ctx.provider.wallet.publicKey.toString() === existingConfig.admin.toString()) {
          await ctx.program.methods.closeConfig().accounts({
            config: ctx.configAccount,
            admin: ctx.provider.wallet.publicKey,
          }).rpc();
        } else {
          expect(existingConfig).to.exist;
          return;
        }
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
    }

    try {
      await ctx.program.methods.initialize(ctx.admin.publicKey, ctx.usdcMint, SWITCHBOARD_PROGRAM_ID)
        .accounts({
          config: ctx.configAccount,
          payer: ctx.admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.admin])
        .rpc();
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        const config = await ctx.program.account.config.fetch(ctx.configAccount);
        expect(config).to.exist;
        return;
      }
      throw error;
    }

    const config = await ctx.program.account.config.fetch(ctx.configAccount);
    expect(config.admin.toString()).to.equal(ctx.admin.publicKey.toString());
    expect(config.usdcMint.toString()).to.equal(ctx.usdcMint.toString());
    expect(config.paused).to.be.false;
  });
});

