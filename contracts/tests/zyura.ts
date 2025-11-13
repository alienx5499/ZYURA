import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zyura } from "../target/types/zyura";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { expect } from "chai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForNextSlot(connection: anchor.web3.Connection) {
  const start = await connection.getSlot();
  while (true) {
    const current = await connection.getSlot();
    if (current > start) break;
    await sleep(200);
  }
}

describe("zyura", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Zyura as Program<Zyura>;
  const provider = anchor.getProvider();

  // Test accounts
  let admin: Keypair;
  let user: Keypair;
  let liquidityProvider: Keypair;
  let usdcMint: PublicKey;
  let usdcMintAuthority: Keypair;
  let configAccount: PublicKey;
  let productAccount: PublicKey;
  let riskPoolVault: PublicKey;
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f");

  // Test data
  const PRODUCT_ID = new anchor.BN(1);
  const POLICY_ID = new anchor.BN(1);
  const DELAY_THRESHOLD_MINUTES = 30;
  const COVERAGE_AMOUNT = new anchor.BN(1000 * 1e6); // 1000 USDC
  const PREMIUM_RATE_BPS = 100; // 1%
  const CLAIM_WINDOW_HOURS = 24;
  const PREMIUM_AMOUNT = new anchor.BN(10 * 1e6); // 10 USDC
  const FLIGHT_NUMBER = "AA123";
  const DEPARTURE_TIME = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  async function ensureConfigActive() {
    try {
      const config = await program.account.config.fetch(configAccount);
      if (!config.admin.equals(admin.publicKey)) {
        throw new Error("Config admin mismatch; ensure tests use seeded admin");
      }
      if (config.paused) {
        await program.methods
          .setPauseStatus(false)
          .accounts({ config: configAccount, admin: admin.publicKey })
          .signers([admin])
          .rpc();
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
      await program.methods
        .initialize(admin.publicKey, usdcMint, SWITCHBOARD_PROGRAM_ID)
        .accounts({
          config: configAccount,
          payer: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }
  }

  async function ensureProductActive() {
    try {
      const product = await program.account.product.fetch(productAccount);
      if (!product.active) {
        await program.methods
          .updateProduct(PRODUCT_ID, product.delayThresholdMinutes, product.coverageAmount, product.premiumRateBps, product.claimWindowHours)
          .accounts({
            config: configAccount,
            product: productAccount,
            admin: admin.publicKey,
          })
          .signers([admin])
          .rpc();
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
      await program.methods
        .createProduct(
          PRODUCT_ID,
          DELAY_THRESHOLD_MINUTES,
          COVERAGE_AMOUNT,
          PREMIUM_RATE_BPS,
          CLAIM_WINDOW_HOURS
        )
        .accounts({
          config: configAccount,
          product: productAccount,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }
  }

  async function ensureProtocolReady() {
    await ensureConfigActive();
    await ensureProductActive();
  }

  before(async () => {
    const adminSeed = Buffer.alloc(32);
    Buffer.from("zyura-test-admin-seed").copy(adminSeed);
    admin = Keypair.fromSeed(adminSeed);

    user = Keypair.generate();
    liquidityProvider = Keypair.generate();
    usdcMintAuthority = Keypair.generate();

    const endpoint = provider.connection.rpcEndpoint.toLowerCase();
    const isLocalnet = endpoint.includes("127.0.0.1") || endpoint.includes("localhost");
    const isDevnet = endpoint.includes("devnet");

    const fundAccount = async (recipient: PublicKey, sol: number) => {
      const lamports = Math.ceil(sol * anchor.web3.LAMPORTS_PER_SOL);
      if (isLocalnet) {
        const sig = await provider.connection.requestAirdrop(recipient, lamports);
        await provider.connection.confirmTransaction(sig, "confirmed");
      } else {
        const tx = new anchor.web3.Transaction().add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: provider.wallet.publicKey,
            toPubkey: recipient,
            lamports,
          })
        );
        await provider.sendAndConfirm(tx);
      }
    };

    // Use 0.5 SOL for both devnet and localnet (localnet uses free airdrops, devnet conserves SOL)
    const adminAmount = 0.5;
    const userAmount = 0.5;
    const lpAmount = 0.5;
    const mintAmount = 0.5;

    await fundAccount(admin.publicKey, adminAmount);
    await fundAccount(user.publicKey, userAmount);
    await fundAccount(liquidityProvider.publicKey, lpAmount);
    await fundAccount(usdcMintAuthority.publicKey, mintAmount);

    await waitForNextSlot(provider.connection);

    usdcMint = await createMint(
      provider.connection,
      usdcMintAuthority,
      usdcMintAuthority.publicKey,
      null,
      6
    );

    [configAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [productAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), PRODUCT_ID.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [riskPoolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("risk_pool_vault")],
      program.programId
    );

    const riskPoolVaultAccount = await createAccount(
      provider.connection,
      admin,
      usdcMint,
      admin.publicKey
    );

    riskPoolVault = riskPoolVaultAccount;
  });

  it("Initializes the ZYURA protocol", async () => {
    await program.methods
      .initialize(admin.publicKey, usdcMint, SWITCHBOARD_PROGRAM_ID)
      .accounts({
        config: configAccount,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const config = await program.account.config.fetch(configAccount);
    expect(config.admin.toString()).to.equal(admin.publicKey.toString());
    expect(config.usdcMint.toString()).to.equal(usdcMint.toString());
    expect(config.paused).to.be.false;
  });

  it("Creates a flight delay insurance product", async () => {
    await ensureConfigActive();

    await program.methods
      .createProduct(
        PRODUCT_ID,
        DELAY_THRESHOLD_MINUTES,
        COVERAGE_AMOUNT,
        PREMIUM_RATE_BPS,
        CLAIM_WINDOW_HOURS
      )
      .accounts({
        config: configAccount,
        product: productAccount,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const product = await program.account.product.fetch(productAccount);
    expect(product.id.toString()).to.equal(PRODUCT_ID.toString());
    expect(product.delayThresholdMinutes).to.equal(DELAY_THRESHOLD_MINUTES);
    expect(product.coverageAmount.toString()).to.equal(COVERAGE_AMOUNT.toString());
    expect(product.premiumRateBps).to.equal(PREMIUM_RATE_BPS);
    expect(product.active).to.be.true;
  });

  it("Allows liquidity provider to deposit USDC", async () => {
    await ensureProtocolReady();

    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), liquidityProvider.publicKey.toBuffer()],
      program.programId
    );

    // Create USDC account for liquidity provider
    const lpUsdcAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      liquidityProvider,
      usdcMint,
      liquidityProvider.publicKey
    );
    const lpUsdcAccount = lpUsdcAta.address;

    // Mint USDC to liquidity provider
    await mintTo(
      provider.connection,
      usdcMintAuthority,
      usdcMint,
      lpUsdcAccount,
      usdcMintAuthority,
      10000 * 1e6 // 10,000 USDC
    );

    const depositAmount = new anchor.BN(1000 * 1e6); // 1000 USDC

    await program.methods
      .depositLiquidity(depositAmount)
      .accounts({
        config: configAccount,
        liquidityProvider: lpAccount,
        riskPoolVault: riskPoolVault,
        userUsdcAccount: lpUsdcAccount,
        user: liquidityProvider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([liquidityProvider])
      .rpc();

    const lp = await program.account.liquidityProvider.fetch(lpAccount);
    expect(lp.totalDeposited.toString()).to.equal(depositAmount.toString());
    expect(lp.activeDeposit.toString()).to.equal(depositAmount.toString());
  });

  it("Allows user to purchase flight delay insurance policy", async () => {
    await ensureProtocolReady();

    const [policyAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create USDC account for user
    const userAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      usdcMint,
      user.publicKey
    );
    const userUsdcAccount = userAta.address;

    // Mint USDC to user
    await mintTo(
      provider.connection,
      usdcMintAuthority,
      usdcMint,
      userUsdcAccount,
      usdcMintAuthority,
      1000 * 1e6 // 1000 USDC
    );

    // Prepare NFT accounts
    const policyNftMint = Keypair.generate();
    const userPolicyNftAta = getAssociatedTokenAddressSync(policyNftMint.publicKey, user.publicKey);

    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy_mint_authority")],
      program.programId
    );
    const metadataUri = `https://example.com/policy/${Date.now()}`;

    await program.methods
      .purchasePolicy(
        POLICY_ID,
        FLIGHT_NUMBER,
        new anchor.BN(DEPARTURE_TIME),
        PREMIUM_AMOUNT,
        false,
        metadataUri
      )
      .accounts({
        config: configAccount,
        product: productAccount,
        policy: policyAccount,
        riskPoolVault: riskPoolVault,
        userUsdcAccount: userUsdcAccount,
        user: user.publicKey,
        policyNftMint: policyNftMint.publicKey,
        userPolicyNftAta: userPolicyNftAta,
        metadataAccount,
        masterEditionAccount,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([user, policyNftMint])
      .rpc();

    await waitForNextSlot(provider.connection);

    const policy = await program.account.policy.fetch(policyAccount);
    expect(policy.id.toString()).to.equal(POLICY_ID.toString());
    expect(policy.policyholder.toString()).to.equal(user.publicKey.toString());
    expect(policy.flightNumber).to.equal(FLIGHT_NUMBER);
    expect(policy.premiumPaid.toString()).to.equal(PREMIUM_AMOUNT.toString());
    expect(policy.status).to.deep.equal({ active: {} });

    // Verify NFT minted to user ATA with amount 1
    const nftAtaAcc = await getAccount(provider.connection, userPolicyNftAta);
    expect(Number(nftAtaAcc.amount)).to.equal(1);

    // Metadata creation is skipped in local tests; only NFT mint balance is verified
  });

  it("Allows admin to pause the protocol", async () => {
    await ensureProtocolReady();

    await program.methods
      .setPauseStatus(true)
      .accounts({
        config: configAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await waitForNextSlot(provider.connection);

    const config = await program.account.config.fetch(configAccount);
    expect(config.paused).to.be.true;

    await program.methods
      .setPauseStatus(false)
      .accounts({
        config: configAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();
  });

  it("Prevents policy purchase when protocol is paused", async () => {
    await ensureProtocolReady();

    await program.methods
      .setPauseStatus(true)
      .accounts({
        config: configAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await waitForNextSlot(provider.connection);

    const POLICY_ID_2 = new anchor.BN(2);
    const [policyAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_2.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create USDC account for user
    const userAta2 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      usdcMint,
      user.publicKey
    );
    const userUsdcAccount2 = userAta2.address;

    // Mint USDC to user
    await mintTo(
      provider.connection,
      usdcMintAuthority,
      usdcMint,
      userUsdcAccount2,
      usdcMintAuthority,
      1000 * 1e6 // 1000 USDC
    );

    try {
      const policyNftMint2 = Keypair.generate();
      const userPolicyNftAta2 = getAssociatedTokenAddressSync(policyNftMint2.publicKey, user.publicKey);
      const [metadataAccount2] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [masterEditionAccount2] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer(), Buffer.from("edition")],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy_mint_authority")],
        program.programId
      );
      const metadataUri2 = `https://example.com/policy/${Date.now()}-paused`;
      await program.methods
        .purchasePolicy(
          POLICY_ID_2,
          "BB456",
          new anchor.BN(DEPARTURE_TIME),
          PREMIUM_AMOUNT,
          false,
          metadataUri2
        )
        .accounts({
          config: configAccount,
          product: productAccount,
          policy: policyAccount2,
          riskPoolVault: riskPoolVault,
          userUsdcAccount: userUsdcAccount2,
          user: user.publicKey,
          policyNftMint: policyNftMint2.publicKey,
          userPolicyNftAta: userPolicyNftAta2,
          metadataAccount: metadataAccount2,
          masterEditionAccount: masterEditionAccount2,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user, policyNftMint2])
        .rpc();
      expect.fail("Expected transaction to fail when protocol is paused");
    } catch (error) {
      expect((error as Error).message).to.include("Protocol is currently paused");
    } finally {
      await waitForNextSlot(provider.connection);

      await program.methods
        .setPauseStatus(false)
        .accounts({
          config: configAccount,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
    }
  });

  it("Allows admin to unpause the protocol", async () => {
    await ensureProtocolReady();

    await program.methods
      .setPauseStatus(true)
      .accounts({
        config: configAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await waitForNextSlot(provider.connection);

    await program.methods
      .setPauseStatus(false)
      .accounts({
        config: configAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await waitForNextSlot(provider.connection);

    const config = await program.account.config.fetch(configAccount);
    expect(config.paused).to.be.false;
  });

  it("Allows liquidity provider to withdraw liquidity", async () => {
    await ensureProtocolReady();

    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), liquidityProvider.publicKey.toBuffer()],
      program.programId
    );

    const lpAta2 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      liquidityProvider,
      usdcMint,
      liquidityProvider.publicKey
    );
    const lpUsdcAccount = lpAta2.address;

    const withdrawShares = new anchor.BN(500 * 1e6); // 500 USDC worth of shares

    await program.methods
      .withdrawLiquidity(withdrawShares)
      .accounts({
        config: configAccount,
        liquidityProvider: lpAccount,
        riskPoolVault: riskPoolVault,
        userUsdcAccount: lpUsdcAccount,
        user: liquidityProvider.publicKey,
        admin: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    const lp = await program.account.liquidityProvider.fetch(lpAccount);
    expect(lp.activeDeposit.toString()).to.equal("500000000"); // 500 USDC remaining
  });

  it("Allows admin to update product parameters", async () => {
    await ensureProtocolReady();

    const newDelayThreshold = 45;
    const newCoverageAmount = new anchor.BN(2000 * 1e6); // 2000 USDC

    await program.methods
      .updateProduct(
        PRODUCT_ID,
        newDelayThreshold,
        newCoverageAmount,
        PREMIUM_RATE_BPS,
        CLAIM_WINDOW_HOURS
      )
      .accounts({
        config: configAccount,
        product: productAccount,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const product = await program.account.product.fetch(productAccount);
    expect(product.delayThresholdMinutes).to.equal(newDelayThreshold);
    expect(product.coverageAmount.toString()).to.equal(newCoverageAmount.toString());
  });

  it("Handles insufficient premium amount", async () => {
    await ensureProtocolReady();

    const POLICY_ID_3 = new anchor.BN(3);
    const [policyAccount3] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_3.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create USDC account for user
    const userAta3 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      usdcMint,
      user.publicKey
    );
    const userUsdcAccount3 = userAta3.address;

    // Mint USDC to user
    await mintTo(
      provider.connection,
      usdcMintAuthority,
      usdcMint,
      userUsdcAccount3,
      usdcMintAuthority,
      1000 * 1e6 // 1000 USDC
    );

    const insufficientPremium = new anchor.BN(1 * 1e6); // 1 USDC (too low)

    try {
      const policyNftMint3 = Keypair.generate();
      const userPolicyNftAta3 = getAssociatedTokenAddressSync(policyNftMint3.publicKey, user.publicKey);
      const [metadataAccount3] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint3.publicKey.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [masterEditionAccount3] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint3.publicKey.toBuffer(), Buffer.from("edition")],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy_mint_authority")],
        program.programId
      );
      const metadataUri3 = `https://example.com/policy/${Date.now()}-insufficient`;
      await program.methods
        .purchasePolicy(
          POLICY_ID_3,
          "CC789",
          new anchor.BN(DEPARTURE_TIME),
          insufficientPremium,
          false,
          metadataUri3
        )
        .accounts({
          config: configAccount,
          product: productAccount,
          policy: policyAccount3,
          riskPoolVault: riskPoolVault,
          userUsdcAccount: userUsdcAccount3,
          user: user.publicKey,
          policyNftMint: policyNftMint3.publicKey,
          userPolicyNftAta: userPolicyNftAta3,
          metadataAccount: metadataAccount3,
          masterEditionAccount: masterEditionAccount3,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user, policyNftMint3])
        .rpc();
      expect.fail("Expected transaction to fail with insufficient premium");
    } catch (error) {
      expect((error as Error).message).to.include("Insufficient premium amount");
    }
  });
});