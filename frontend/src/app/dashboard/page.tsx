"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plane, ShieldCheck, Clock, FileText } from "lucide-react";
import { Navbar1 } from "@/components/ui/navbar-1";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, createBurnInstruction, createCloseAccountInstruction, createThawAccountInstruction } from "@solana/spl-token";
import BN from "bn.js";
import bs58 from "bs58";
import idlJson from "@/idl/zyura.json";

// Constants
const PROGRAM_ID = new PublicKey("H8713ke9JBR9uHkahFMP15482LH2XkMdjNvmyEwRzeaX");
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || "4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const PRODUCT_ID = 1; // Default product ID

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [flightNumber, setFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [productId, setProductId] = useState("");
  const [pnr, setPnr] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string }>>([]);
  const [selectedProductInfo, setSelectedProductInfo] = useState<any | null>(null);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [myPolicies, setMyPolicies] = useState<any[]>([]);
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [myNfts, setMyNfts] = useState<Array<{ mint: string; tokenAccount: string; name?: string; image?: string }>>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  
  // Precomputed select options for time (30-min intervals)
  const timeOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const value = `${hh}:${mm}`; // HH:MM
        const date = new Date();
        date.setHours(h, m, 0, 0);
        const label = date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        options.push({ value, label });
      }
    }
    return options;
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not connected, don't redirect; allow user to connect on this page
  React.useEffect(() => {
    if (!connected) {
      // Optionally show a toast once
      // toast.message("Connect your wallet to purchase insurance");
    }
  }, [connected]);

  // Load products automatically on mount/connection
  React.useEffect(() => {
    if (!connected) return;
    (async () => {
      await fetchProducts();
      // If none selected yet, pick the first and show details
      setTimeout(async () => {
        if (!productId && products.length > 0) {
          const first = products[0].id;
          setProductId(first);
          await showProductById(first);
        }
      }, 0);
    })();
  }, [connected]);

  // Load user's policies when connected/publicKey available
  React.useEffect(() => {
    if (!connected || !publicKey) return;
    fetchMyPolicies();
  }, [connected, publicKey]);

  const showProductById = async (id: string) => {
    try {
      setSelectedProductInfo(null);
      const idNum = parseInt(id, 10);
      if (Number.isNaN(idNum)) return;
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), new BN(idNum).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      const info = await connection.getAccountInfo(productPda);
      if (!info) return;
      const decoded: any = coder.accounts.decode("Product", info.data);
      setSelectedProductInfo(decoded);
    } catch (e) {
      // noop
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const disc = coder.accounts.accountDiscriminator("Product");
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } },
        ],
      });
      const items: Array<{ id: string }> = [];
      for (const acc of accounts) {
        try {
          const decoded: any = coder.accounts.decode("Product", acc.account.data);
          // Attempt to read product id field from decoded account
          const idBn: anchor.BN | undefined = decoded.productId || decoded.product_id || decoded.id;
          const id = idBn ? new BN(idBn.toString()).toString() : undefined;
          if (id) {
            items.push({ id });
          }
        } catch (_) {
          // skip decode errors
        }
      }
      // unique & sorted
      const unique = Array.from(new Set(items.map(i => i.id))).sort((a,b) => Number(a) - Number(b));
      setProducts(unique.map(id => ({ id })));
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch products", { description: e.message });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchMyPolicies = async () => {
    try {
      setIsLoadingPolicies(true);
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const disc = coder.accounts.accountDiscriminator("Policy");
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } },
        ],
      });
      const items: any[] = [];
      for (const acc of accounts) {
        try {
          const decoded: any = coder.accounts.decode("Policy", acc.account.data);
          if (decoded.policyholder?.toString?.() === publicKey?.toString()) {
            items.push(decoded);
          }
        } catch (_) { /* ignore */ }
      }
      // Sort by created_at desc if available
      items.sort((a, b) => Number((b.created_at ?? 0).toString()) - Number((a.created_at ?? 0).toString()));
      setMyPolicies(items);
    } catch (e) {
      // silent fail
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const parseUriFromMetadataAccount = (data: Buffer): string | undefined => {
    // Robust heuristic: search for common URI prefixes and read until first null byte
    const prefixes = ["https://", "http://", "ipfs://"];
    const str = data.toString("utf8");
    let best: string | undefined;
    for (const p of prefixes) {
      const idx = str.indexOf(p);
      if (idx !== -1) {
        // Read up to 256 chars or until a control/null
        let end = Math.min(idx + 256, str.length);
        for (let i = idx; i < Math.min(idx + 256, str.length); i++) {
          const ch = str.charCodeAt(i);
          if (ch === 0 || ch === 10 || ch === 13) { end = i; break; }
        }
        const uri = str.slice(idx, end).replace(/\0+$/, "").trim();
        if (uri) { best = uri; break; }
      }
    }
    return best;
  };

  const fetchMyNfts = async () => {
    try {
      setIsLoadingNfts(true);
      const parsed = await connection.getParsedTokenAccountsByOwner(publicKey!, { programId: TOKEN_PROGRAM_ID });
      const candidates = parsed.value.filter((acc: any) => {
        const info = acc.account.data.parsed.info;
        const amount = info.tokenAmount;
        return amount.decimals === 0 && amount.uiAmount === 1;
      });
      const results: Array<{ mint: string; tokenAccount: string; name?: string; image?: string }> = [];
      for (const c of candidates) {
        const mintStr = c.account.data.parsed.info.mint as string;
        const tokenAccount = c.pubkey.toString();
        try {
          const mintPk = new PublicKey(mintStr);
          const [metaPda] = PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintPk.toBuffer(),
          ], TOKEN_METADATA_PROGRAM_ID);
          const metaAcc = await connection.getAccountInfo(metaPda);
          let name: string | undefined;
          let image: string | undefined;
          if (metaAcc) {
            const uri = parseUriFromMetadataAccount(metaAcc.data as Buffer);
            if (uri) {
              try {
                const resp = await fetch(uri);
                const j = await resp.json();
                name = j.name;
                image = j.image;
              } catch {}
            }
          }
          results.push({ mint: mintStr, tokenAccount, name, image });
        } catch {
          results.push({ mint: mintStr, tokenAccount });
        }
      }
      setMyNfts(results);
    } catch {
      setMyNfts([]);
    } finally {
      setIsLoadingNfts(false);
    }
  };

  const handleBurnNft = async (mintStr: string, tokenAccountStr?: string) => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet");
      return;
    }
    try {
      const mintPk = new PublicKey(mintStr);
      const tokenAccount = tokenAccountStr
        ? new PublicKey(tokenAccountStr)
        : getAssociatedTokenAddressSync(mintPk, publicKey);
      // Check if mint has freeze authority and if the connected wallet controls it
      let thawIx: any | null = null;
      try {
        const mintInfo = await connection.getParsedAccountInfo(mintPk);
        const freezeAuthority = (mintInfo.value as any)?.data?.parsed?.info?.freezeAuthority as string | undefined;
        if (freezeAuthority && freezeAuthority === publicKey.toString()) {
          thawIx = createThawAccountInstruction(tokenAccount, mintPk, publicKey);
        }
      } catch {}

      const ixBurn = createBurnInstruction(tokenAccount, mintPk, publicKey, 1);
      const ixClose = createCloseAccountInstruction(tokenAccount, publicKey, publicKey);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const burnTx = new Transaction();
      if (thawIx) burnTx.add(thawIx);
      burnTx.add(ixBurn, ixClose);
      burnTx.feePayer = publicKey;
      burnTx.recentBlockhash = blockhash;
      burnTx.lastValidBlockHeight = lastValidBlockHeight;
      const signed = await signTransaction(burnTx);
      let sig: string;
      try {
        sig = await connection.sendRawTransaction(signed.serialize());
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes('Account is frozen') && !thawIx) {
          toast.error('Account is frozen', { description: 'Ask the freeze authority (admin) to thaw or burn.' });
          return;
        }
        throw e;
      }
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      toast.success("NFT burned", { description: sig });
      fetchMyNfts();
    } catch (e: any) {
      toast.error("Burn failed", { description: e.message || String(e) });
    }
  };

  const showProduct = async () => {
    try {
      setSelectedProductInfo(null);
      const idNum = parseInt(productId, 10);
      if (Number.isNaN(idNum)) {
        toast.error("Enter a valid product id first");
        return;
      }
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), new BN(idNum).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      const info = await connection.getAccountInfo(productPda);
      if (!info) {
        toast.error("Product account not found");
        return;
      }
      const decoded: any = coder.accounts.decode("Product", info.data);
      setSelectedProductInfo(decoded);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load product", { description: e.message });
    }
  };

  const handleBuy = async () => {
    if (!flightNumber || !departureDate || !departureTime || !productId) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsSubmitting(true);
    try {
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      // Calculate departure time from date and time (UTC)
      const departureDateTime = new Date(`${departureDate}T${departureTime}:00Z`);
      const departureUnix = Math.floor(departureDateTime.getTime() / 1000);
      const departureTimeBn = new BN(departureUnix);

      // Generate a policy ID (frontend). Protocol may also set/validate this.
      const policyId = Math.floor(Date.now() / 1000) % 1000000;

      // Determine premium from product: premium = coverage_amount * premium_rate_bps / 10_000
      // All monetary amounts are in 6dp
      const productInfoAcc = await connection.getAccountInfo(
        PublicKey.findProgramAddressSync(
          [Buffer.from("product"), new BN(parseInt(productId, 10)).toArrayLike(Buffer, "le", 8)],
          PROGRAM_ID
        )[0]
      );
      if (!productInfoAcc) {
        throw new Error("Selected product not found");
      }
      const decodedProduct: any = coder.accounts.decode("Product", productInfoAcc.data);
      const coverageAmount6dp = new BN((decodedProduct.coverage_amount as any).toString());
      const premiumRateBps: number = Number((decodedProduct.premium_rate_bps as any).toString());
      const premiumAmount = coverageAmount6dp.mul(new BN(premiumRateBps)).div(new BN(10_000));

      toast.info("Preparing metadata and assets...", {
        description: "Uploading SVG and metadata to GitHub"
      });

      // Load and customize SVG template
      const svgResponse = await fetch("/zyura.svg");
      let svg = await svgResponse.text();
      const departureIso = new Date(departureDateTime.getTime()).toISOString();

      // Convert 6dp values to USD format (divide by 1,000,000)
      const premiumUsd = (Number(premiumAmount.toString()) / 1_000_000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const coverageUsd = (Number(coverageAmount6dp.toString()) / 1_000_000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Replace placeholders in SVG
      svg = svg
        .replaceAll("[FLIGHT_NUMBER]", flightNumber)
        .replaceAll("[POLICY_ID]", policyId.toString())
        .replaceAll("[PRODUCT_ID]", productId)
        .replaceAll("[DEPARTURE_ISO]", departureIso)
        .replaceAll("[PREMIUM_6DP]", premiumUsd)
        .replaceAll("[COVERAGE_6DP]", coverageUsd)
        .replaceAll("[PASSENGER_NAME]", "[NAME]")
        .replaceAll("[PNR]", pnr || "[PNR]")
        .replaceAll("[DEPARTURE_AIRPORT]", "[DEPARTURE]")
        .replaceAll("[ARRIVAL_AIRPORT]", "[ARRIVAL]")
        .replaceAll("[AIRLINE]", "[AIRLINE]")
        .replaceAll("[EMAIL]", "[EMAIL]")
        .replaceAll("[PHONE]", "[PHONE]")
        .replaceAll("[BOOKING_REFERENCE]", "[BOOKING]")
        .replaceAll("[TRAVEL_CLASS]", "[CLASS]");

      // Upload SVG to GitHub (per-wallet folder)
      const svgFilename = `${publicKey.toString()}/policy-${policyId}.svg`;
      const svgUploadResponse = await fetch("/api/github/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: svg,
          filePath: svgFilename,
          message: `Add SVG image for ZYURA Policy ${policyId}`,
        }),
      });

      if (!svgUploadResponse.ok) {
        const error = await svgUploadResponse.json();
        throw new Error(`Failed to upload SVG: ${error.error || "Unknown error"}`);
      }

      const { url: svgUrl } = await svgUploadResponse.json();

      // Create metadata matching GitHub structure
      const metadata = {
        name: `ZYURA Policy ${policyId} ${flightNumber}`,
        symbol: "ZYURA",
        image: svgUrl,
        attributes: [
          { trait_type: "Product ID", value: productId },
          { trait_type: "Policy ID", value: policyId.toString() },
          { trait_type: "Flight", value: flightNumber },
          { trait_type: "PNR", value: pnr || "N/A" },
          { trait_type: "Departure", value: departureIso },
          { trait_type: "Premium (6dp)", value: premiumAmount.toString() },
          { trait_type: "Wallet Address", value: publicKey.toString() },
        ],
      };

      // Upload metadata to GitHub (per-wallet folder)
      const metadataFilename = `${publicKey.toString()}/policy-${policyId}.json`;
      const metadataUploadResponse = await fetch("/api/github/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify(metadata, null, 2),
          filePath: metadataFilename,
          message: `Add/update metadata for ZYURA Policy ${policyId}`,
        }),
      });

      if (!metadataUploadResponse.ok) {
        const error = await metadataUploadResponse.json();
        throw new Error(`Failed to upload metadata: ${error.error || "Unknown error"}`);
      }

      const { url: metadataUri } = await metadataUploadResponse.json();

      toast.info("Building transaction...", {
        description: "Preparing your insurance purchase"
      });

      

      // Derive PDAs
      const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), new BN(parseInt(productId, 10)).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      const [policyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy"), new BN(policyId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      // Get config account to find admin (risk pool)
      const configAccountInfo = await connection.getAccountInfo(configPda);
      if (!configAccountInfo) {
        throw new Error("Protocol not initialized. Please contact support.");
      }
      const decodedConfig: any = coder.accounts.decode("Config", configAccountInfo.data);
      const adminPubkey = new PublicKey(decodedConfig.admin);

      // Get/create user USDC ATA
      const { value: userAta } = await connection.getParsedAccountInfo(
        getAssociatedTokenAddressSync(USDC_MINT, publicKey)
      );
      if (!userAta) {
        throw new Error("Please ensure you have USDC in your wallet");
      }
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

      // Get admin USDC ATA (risk pool vault)
      const riskPoolVault = getAssociatedTokenAddressSync(USDC_MINT, adminPubkey);

      // Generate NFT mint keypair
      const policyNftMint = Keypair.generate();
      const userPolicyNftAta = getAssociatedTokenAddressSync(
        policyNftMint.publicKey,
        publicKey
      );

      // Metadata accounts
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          policyNftMint.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          policyNftMint.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy_mint_authority")],
        PROGRAM_ID
      );

      // Build instruction
      const data = coder.instruction.encode("purchase_policy", {
        policy_id: new BN(policyId),
        flight_number: flightNumber,
        departure_time: departureTimeBn,
        premium_amount: premiumAmount,
        create_metadata: true,
        metadata_uri: metadataUri,
      } as any);

      const keys = [
        { pubkey: configPda, isWritable: true, isSigner: false },
        { pubkey: productPda, isWritable: true, isSigner: false },
        { pubkey: policyPda, isWritable: true, isSigner: false },
        { pubkey: riskPoolVault, isWritable: true, isSigner: false },
        { pubkey: userUsdcAccount, isWritable: true, isSigner: false },
        { pubkey: publicKey, isWritable: true, isSigner: true },
        { pubkey: policyNftMint.publicKey, isWritable: true, isSigner: true },
        { pubkey: userPolicyNftAta, isWritable: true, isSigner: false },
        { pubkey: metadataAccount, isWritable: true, isSigner: false },
        { pubkey: masterEditionAccount, isWritable: true, isSigner: false },
        { pubkey: TOKEN_METADATA_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: mintAuthority, isWritable: false, isSigner: false },
        {
          pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          isWritable: false,
          isSigner: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ];

      const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

      // Build transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      // Partially sign with NFT mint first (we have the keypair)
      tx.partialSign(policyNftMint);

      toast.info("Please sign the transaction in your wallet", {
        description: "Review and approve the transaction"
      });

      // Sign with wallet (this will complete the signing)
      const signedTx = await signTransaction(tx);
      const expectedSignature = signedTx.signatures?.[0]?.signature
        ? bs58.encode(Buffer.from(signedTx.signatures[0].signature))
        : undefined;

      // Serialize and send the fully signed transaction
      const serializedTx = signedTx.serialize({
        requireAllSignatures: true,
        verifySignatures: false,
      });

      toast.info("Sending transaction...", {
        description: "Please wait"
      });

      let signature: string;
      try {
        signature = await connection.sendRawTransaction(serializedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes("already been processed") && expectedSignature) {
          signature = expectedSignature;
        } else {
          throw e;
        }
      }

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      toast.success("Insurance purchased successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`
      });

      // Reset form
      setFlightNumber("");
      setDepartureDate("");
      setDepartureTime("");
      setPnr("");
      setProductId("");

      // Refresh user's policies
      fetchMyPolicies();
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error("Purchase failed", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Navbar1 />
    <main className="min-h-screen bg-black pt-28 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-neutral-50 to-neutral-400">
            Dashboard
          </h1>
          <p className="text-neutral-300 mt-2">
            Manage your protection and purchase new flight delay insurance.
          </p>
        </div>

        <section data-section="buy" id="buy" className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-purple-600/30 to-cyan-600/30 border border-purple-600/30 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-purple-300" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Buy Flight Delay Insurance</h2>
            </div>
            <button
              onClick={() => setShowBuyForm((s) => !s)}
              className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            >
              {showBuyForm ? 'Hide' : 'Buy Policy'}
            </button>
          </div>

          {!showBuyForm ? (
            <div className="text-neutral-400 text-sm">
              Start a new purchase when you’re ready. Click “Buy Policy” to open the form.
            </div>
          ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Plane className="h-5 w-5 text-purple-400" />
                Flight Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-300 mb-2 block">Product ID *</label>
                  <div className="relative">
                    <ShieldCheck className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={productId}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setProductId(v);
                        if (v) await showProductById(v);
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="" disabled>{products.length ? 'Select a product' : 'Loading products...'}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{`Product ${p.id}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-300 mb-2 block">Flight Number *</label>
                  <div className="relative">
                    <Plane className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                      placeholder="e.g., AP986, AI202"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-300 mb-2 block">PNR</label>
                  <div className="relative">
                    <FileText className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={pnr}
                      onChange={(e) => setPnr(e.target.value.toUpperCase())}
                      placeholder="e.g., ABC123"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>
                <div onClick={() => {
                  const el = dateInputRef.current as any;
                  if (el?.showPicker) { el.showPicker(); }
                }}>
                  <label className="text-sm text-neutral-300 mb-2 block">Departure Date (UTC) *</label>
                  <div className="relative">
                    <Calendar className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-300 mb-2 block">Departure Time (UTC) *</label>
                  <div className="relative">
                    <Clock className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="" disabled>Select time</option>
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-neutral-500">
                    Times are interpreted in UTC. Please enter the scheduled departure in UTC to avoid mismatches.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleBuy}
              disabled={!productId || !flightNumber || !departureDate || !departureTime || isSubmitting || !connected}
                className="px-8 py-3 rounded-lg bg-linear-to-r from-purple-600 to-cyan-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {isSubmitting ? "Processing..." : "Buy Insurance"}
              </button>
            </div>
          {selectedProductInfo && (
            <div className="mt-6 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
              <h4 className="text-white font-medium mb-3">Product Details</h4>
              {/* Format helpers inline for clarity */}
              {(() => {
                const toNumber = (v: any): number | undefined => {
                  if (v === null || v === undefined) return undefined;
                  if (typeof v === 'number') return v;
                  if (typeof v === 'string') {
                    if (/^[0-9]+$/.test(v)) return Number(v);
                    if (/^[0-9a-fA-F]+$/.test(v)) return parseInt(v, 16);
                  }
                  if (typeof v === 'object' && 'toString' in v) {
                    try { return Number((v as any).toString()); } catch {}
                  }
                  return undefined;
                };

                const idNum = toNumber((selectedProductInfo as any).id);
                const delayMin = toNumber((selectedProductInfo as any).delay_threshold_minutes);
                const coverage6dp = toNumber((selectedProductInfo as any).coverage_amount);
                const premiumBps = toNumber((selectedProductInfo as any).premium_rate_bps);
                const claimHours = toNumber((selectedProductInfo as any).claim_window_hours);
                const active = Boolean((selectedProductInfo as any).active);

                const coverageUsd = typeof coverage6dp === 'number'
                  ? (coverage6dp / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—';
                const premiumPct = typeof premiumBps === 'number'
                  ? `${(premiumBps / 100).toFixed(2)}%`
                  : '—';

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Product ID</div>
                      <div className="text-white text-lg font-medium">
                        {idNum ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Delay Threshold</div>
                      <div className="text-white text-lg font-medium">
                        {delayMin ?? '—'}{typeof delayMin === 'number' ? ' min' : ''}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Coverage Amount</div>
                      <div className="text-white text-lg font-medium">{coverageUsd}</div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Premium Rate</div>
                      <div className="text-white text-lg font-medium">{premiumPct}</div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Claim Window</div>
                      <div className="text-white text-lg font-medium">
                        {claimHours ?? '—'}{typeof claimHours === 'number' ? ' hrs' : ''}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                      <div className="text-xs text-neutral-400">Status</div>
                      <div className={`text-lg font-medium ${active ? 'text-emerald-400' : 'text-neutral-400'}`}>
                        {active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>
          )}

          <p className="text-neutral-400 text-sm mt-4">
            Your policy terms are enforced by smart contracts and oracle-verified flight data. Payouts are automatic in USDC when delay thresholds are met.
          </p>
        </section>

        {/* My Policies */}
        <section data-section="policies" id="policies" className="mt-8 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-purple-600/30 to-cyan-600/30 border border-purple-600/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-purple-300" />
            </div>
            <h2 className="text-2xl font-semibold text-white">My Policies</h2>
          </div>

          {!connected ? (
            <p className="text-neutral-400 text-sm">Connect your wallet to view your policies.</p>
          ) : isLoadingPolicies ? (
            <p className="text-neutral-400 text-sm">Loading policies...</p>
          ) : myPolicies.length === 0 ? (
            <p className="text-neutral-400 text-sm">No policies found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(showAllPolicies ? myPolicies : myPolicies.slice(0, 2)).map((p) => {
                const toNum = (v: any) => Number((v ?? 0).toString());
                const policyId = toNum(p.id);
                const productIdAttr = toNum(p.product_id);
                const dep = toNum(p.departure_time);
                const premium6 = toNum(p.premium_paid);
                const coverage6 = toNum(p.coverage_amount);
                const status = p.status ? Object.keys(p.status)[0] : "Active";
                const depIso = dep ? new Date(dep * 1000).toISOString() : "—";
                const premiumUsd = (premium6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                const coverageUsd = (coverage6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                return (
                  <PolicyCard
                    key={policyId}
                    policyId={policyId}
                    status={status}
                    productId={productIdAttr}
                    flight={p.flight_number || '—'}
                    departureIso={depIso}
                    premiumUsd={premiumUsd}
                    coverageUsd={coverageUsd}
                  />
                );
              })}
              {myPolicies.length > 2 && (
                <div className="md:col-span-2 flex justify-center">
                  <button
                    onClick={() => setShowAllPolicies((s) => !s)}
                    className="mt-2 px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  >
                    {showAllPolicies ? 'Show less' : `Show all (${myPolicies.length})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        
      </div>
    </main>
    </>
  );
}

// Small presentational building blocks
function PolicyCard({
  policyId,
  status,
  productId,
  flight,
  departureIso,
  premiumUsd,
  coverageUsd,
}: {
  policyId: number;
  status: string;
  productId: number;
  flight: string;
  departureIso: string;
  premiumUsd: string;
  coverageUsd: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-medium">Policy #{policyId}</div>
        <div className={`text-xs ${status === 'Active' ? 'text-emerald-400' : 'text-neutral-400'}`}>{status}</div>
      </div>
      <div className="text-sm text-neutral-300">Product: {productId}</div>
      <div className="text-sm text-neutral-300">Flight: {flight || '—'}</div>
      <div className="text-sm text-neutral-300">Departure: {departureIso}</div>
      <div className="text-sm text-neutral-300">Premium: {premiumUsd}</div>
      <div className="text-sm text-neutral-300">Coverage: {coverageUsd}</div>
    </div>
  );
}


