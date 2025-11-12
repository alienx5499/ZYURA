'use client';

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plane, ShieldCheck, Clock, FileText, Plus, ChevronDown, AlertCircle } from "lucide-react";
import { Navbar1 } from "@/components/ui/navbar-1";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import bs58 from "bs58";
import idlJson from "@/idl/zyura.json";
import { motion, AnimatePresence } from "framer-motion";

// Import new components
import { PolicyCard } from "@/components/dashboard/PolicyCard";
import { SkeletonCard } from "@/components/dashboard/SkeletonCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FormField } from "@/components/dashboard/FormField";
import { ProductStatsCard } from "@/components/dashboard/ProductStatsCard";
import { PolicyModal } from "@/components/dashboard/PolicyModal";

// Constants
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || "4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  // Form state
  const [flightNumber, setFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [productId, setProductId] = useState("");
  const [pnr, setPnr] = useState("");
  
  // UI state
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);
  
  // Data state
  const [products, setProducts] = useState<Array<{ id: string }>>([]);
  const [selectedProductInfo, setSelectedProductInfo] = useState<any | null>(null);
  const [myPolicies, setMyPolicies] = useState<any[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalData, setPolicyModalData] = useState<any>(null);
  const [fetchedPassenger, setFetchedPassenger] = useState<any | null>(null);
  const [isFetchingPnr, setIsFetchingPnr] = useState(false);
  const [pnrStatus, setPnrStatus] = useState<"fetching" | "found" | "not-found" | null>(null);

  // Time options for departure time selector
  const timeOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const value = `${hh}:${mm}`;
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

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch policies when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchMyPolicies();
    } else {
      setMyPolicies([]);
    }
  }, [connected, publicKey]);

  // Auto-fetch PNR data when user enters 6-character PNR
  useEffect(() => {
    if (!pnr || pnr.length !== 6) {
      setFetchedPassenger(null);
      setPnrStatus(null);
      return;
    }

    const fetchPnrData = async () => {
      setIsFetchingPnr(true);
      setPnrStatus("fetching");
      try {
        const response = await fetch(`/api/zyura/pnr/search?pnr=${encodeURIComponent(pnr)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.flight_number) setFlightNumber(data.flight_number);
          if (data.date) setDepartureDate(data.date);
          if (data.scheduled_departure_unix) {
            const depDate = new Date(data.scheduled_departure_unix * 1000);
            const hours = String(depDate.getUTCHours()).padStart(2, "0");
            const minutes = String(depDate.getUTCMinutes()).padStart(2, "0");
            setDepartureTime(`${hours}:${minutes}`);
          }
          if (data.passenger) {
            setFetchedPassenger(data.passenger);
          }
            setPnrStatus("found");
          toast.success("PNR found! Details auto-filled.");
          } else {
          setPnrStatus("not-found");
        }
      } catch (error) {
        console.error("Error fetching PNR:", error);
        setPnrStatus("not-found");
      } finally {
        setIsFetchingPnr(false);
      }
    };

    fetchPnrData();
  }, [pnr]);

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
          const idBn: anchor.BN | undefined = decoded.productId || decoded.product_id || decoded.id;
          const id = idBn ? new BN(idBn.toString()).toString() : undefined;
          if (id) {
            items.push({ id });
          }
        } catch (_) {
          // skip decode errors
        }
      }
      const unique = Array.from(new Set(items.map(i => i.id))).sort((a,b) => Number(a) - Number(b));
      const mapped = unique.map(id => ({ id }));
      setProducts(mapped);
      if (!productId && mapped.length > 0) {
        const firstId = mapped[0].id;
        setProductId(firstId);
        try { await showProductById(firstId); } catch {}
      }
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
      const userPubkeyStr = publicKey?.toString();
      if (!userPubkeyStr) {
        setMyPolicies([]);
        return;
      }
      const items: any[] = [];
      for (const acc of accounts) {
        try {
          const decoded: any = coder.accounts.decode("Policy", acc.account.data);
          let policyholderStr: string | null = null;
          try {
            if (decoded.policyholder) {
              const policyholderPk = new PublicKey(decoded.policyholder);
              policyholderStr = policyholderPk.toString();
            }
          } catch (e) {
            policyholderStr = decoded.policyholder?.toString?.() || null;
          }
          if (policyholderStr === userPubkeyStr) {
            items.push(decoded);
          }
        } catch (_) { /* ignore */ }
      }
      items.sort((a, b) => Number((b.created_at ?? 0).toString()) - Number((a.created_at ?? 0).toString()));
      setMyPolicies(items);
    } catch (e) {
      console.error("Error fetching policies:", e);
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const showProductById = async (id: string) => {
    try {
      const idNum = parseInt(id, 10);
      if (Number.isNaN(idNum)) return;
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
      const departureDateTime = new Date(`${departureDate}T${departureTime}:00Z`);
      const departureUnix = Math.floor(departureDateTime.getTime() / 1000);
      const departureTimeBn = new BN(departureUnix);
      const policyId = Math.floor(Date.now() / 1000) % 1000000;

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

      toast.info("Preparing metadata and assets...");

      // Load and customize SVG template
      const svgResponse = await fetch("/zyura-nft-insurance.svg");
      let svg = await svgResponse.text();
      const departureIso = new Date(departureDateTime.getTime()).toISOString();

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

      svg = svg
        .replaceAll("[FLIGHT_NUMBER]", flightNumber)
        .replaceAll("[POLICY_ID]", policyId.toString())
        .replaceAll("[PRODUCT_ID]", productId)
        .replaceAll("[DEPARTURE_ISO]", departureIso)
        .replaceAll("[PREMIUM_6DP]", premiumUsd)
        .replaceAll("[COVERAGE_6DP]", coverageUsd)
        .replaceAll("[PNR]", pnr || "[PNR]");

      // Upload SVG
      const svgFilename = `${publicKey.toString()}/${policyId}/policy.svg`;
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

      // Create metadata
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

      // Upload metadata
      const metadataFilename = `${publicKey.toString()}/${policyId}/policy.json`;
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

      toast.info("Building transaction...");

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

      // Get config account
      const configAccountInfo = await connection.getAccountInfo(configPda);
      if (!configAccountInfo) {
        throw new Error("Protocol not initialized. Please contact support.");
      }
      
      let decodedConfig: any;
      try {
        decodedConfig = coder.accounts.decode("Config", configAccountInfo.data);
      } catch (err: any) {
        if (err.message?.includes("discriminator") || err.message?.includes("Invalid account discriminator")) {
          const dataWithoutDiscriminator = configAccountInfo.data.slice(8);
          const adminBytes = dataWithoutDiscriminator.slice(0, 32);
          const usdcMintBytes = dataWithoutDiscriminator.slice(32, 64);
          const switchboardProgramBytes = dataWithoutDiscriminator.slice(64, 96);
          const paused = dataWithoutDiscriminator[96] === 1;
          const bump = dataWithoutDiscriminator[97];
          decodedConfig = {
            admin: new PublicKey(adminBytes).toString(),
            usdc_mint: new PublicKey(usdcMintBytes).toString(),
            switchboard_program: new PublicKey(switchboardProgramBytes).toString(),
            paused: paused,
            bump: bump,
          };
        } else {
          throw err;
        }
      }
      
      const adminPubkey = new PublicKey(decodedConfig.admin);
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const riskPoolVault = getAssociatedTokenAddressSync(USDC_MINT, adminPubkey);
      const policyNftMint = Keypair.generate();
      const userPolicyNftAta = getAssociatedTokenAddressSync(policyNftMint.publicKey, publicKey);

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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      tx.partialSign(policyNftMint);

      toast.info("Please sign the transaction in your wallet");

      const signedTx = await signTransaction(tx);
      const expectedSignature = signedTx.signatures?.[0]?.signature
        ? bs58.encode(Buffer.from(signedTx.signatures[0].signature))
        : undefined;

      const serializedTx = signedTx.serialize({
        requireAllSignatures: true,
        verifySignatures: false,
      });

      toast.info("Sending transaction...");

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

      setLastTxSig(signature);

      toast.success("Insurance purchased successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`
      });

      // Reset form
      setFlightNumber("");
      setDepartureDate("");
      setDepartureTime("");
      setPnr("");
      setProductId("");
      setFetchedPassenger(null);
      setPnrStatus(null);
      setShowBuyForm(false);

      // Refresh policies
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

  const openPolicyModal = async (policy: any) => {
    const toNum = (v: any) => Number((v ?? 0).toString());
    const policyId = toNum(policy.id);
    const productIdAttr = toNum(policy.product_id);
    const dep = toNum(policy.departure_time);
    const premium6 = toNum(policy.premium_paid);
    const coverage6 = toNum(policy.coverage_amount);

    let status = 'Unknown';
    if (policy.status) {
      if (policy.status.Active !== undefined || policy.status.active !== undefined) {
        status = 'Active';
      } else if (policy.status.PaidOut !== undefined || policy.status.paidOut !== undefined || policy.status.paid_out !== undefined) {
        status = 'PaidOut';
      } else if (policy.status.Expired !== undefined || policy.status.expired !== undefined) {
        status = 'Expired';
      } else if (typeof policy.status === 'string') {
        status = policy.status;
      } else {
        const keys = Object.keys(policy.status);
        if (keys.length > 0) {
          status = keys[0];
        }
      }
    }

    const departureIso = new Date(dep * 1000).toISOString();
    const premiumUsd = (premium6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const coverageUsd = (coverage6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const ep = connection.rpcEndpoint || '';
    const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
    const explorerUrl = `https://explorer.solana.com/address/${publicKey?.toString()}?cluster=${cluster}`;

    // Try to fetch NFT metadata and image
    let imageUrl: string | undefined;
    let metadataUrl: string | undefined;
    
    // Generate expected URLs based on GitHub structure (with /metadata/ folder)
    const expectedSvgUrl = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${publicKey?.toString()}/${policyId}/policy.svg`;
    const expectedJsonUrl = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${publicKey?.toString()}/${policyId}/policy.json`;

    try {
      // Try to fetch the metadata JSON
      const metadataResponse = await fetch(expectedJsonUrl);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        imageUrl = metadata.image || expectedSvgUrl;
        metadataUrl = expectedJsonUrl;
        console.log('✅ NFT metadata loaded:', expectedJsonUrl);
      } else {
        // Fallback to expected SVG URL
        imageUrl = expectedSvgUrl;
        console.log('⚠️ JSON not found, trying SVG directly:', expectedSvgUrl);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch NFT metadata, using fallback:', error);
      imageUrl = expectedSvgUrl;
    }

    setPolicyModalData({
      policyId,
      productId: productIdAttr,
      status,
      flight: policy.flight_number || '',
      departureIso,
      premiumUsd,
      coverageUsd,
      explorerUrl,
      imageUrl,
      metadataUrl,
      expectedJsonUrl,
      expectedSvgUrl,
    });
    setShowPolicyModal(true);
  };

  return (
    <>
    <Navbar1 />
      <main className="min-h-screen bg-black pt-24 pb-16">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Dashboard
          </h1>
            <p className="text-gray-400 text-lg">
              Manage your flight delay insurance policies
          </p>
          </motion.div>

          {/* Last Transaction Banner */}
          <AnimatePresence>
          {lastTxSig && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 rounded-xl border border-dark-border-strong bg-accent-success/10 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></div>
              <div>
                    <p className="text-sm font-medium text-white">Policy Purchased Successfully</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {lastTxSig.slice(0, 8)}...{lastTxSig.slice(-8)}
                    </p>
                  </div>
              </div>
              {(() => {
                const ep = connection.rpcEndpoint || '';
                const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
                const url = `https://explorer.solana.com/tx/${lastTxSig}?cluster=${cluster}`;
                return (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noreferrer" 
                            className="px-4 py-2 rounded-lg bg-black hover:bg-gray-800 border border-gray-700 text-white text-sm font-medium transition-colors"
                    >
                    View on Explorer
                  </a>
                );
              })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Primary Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buy Insurance Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-black border border-dark-border rounded-2xl p-6 md:p-8"
              >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
                    <h2 className="text-2xl font-semibold text-white">Buy Insurance</h2>
            </div>
            <button
              onClick={() => setShowBuyForm((s) => !s)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      showBuyForm 
                        ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {showBuyForm ? 'Hide Form' : <><Plus className="w-4 h-4 inline mr-2" />Buy Policy</>}
            </button>
          </div>

          {!connected && (
                  <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Wallet Not Connected</p>
                      <p className="text-xs text-gray-300 mt-1">
                        Connect your wallet to purchase insurance policies.
                      </p>
                    </div>
            </div>
          )}

                <AnimatePresence>
                  {showBuyForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
          <div className="space-y-6">
                        {/* Form Fields */}
                        <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Selection */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-text-primary">
                                Product *
                              </label>
                    <select
                      value={productId}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setProductId(v);
                        if (v) await showProductById(v);
                      }}
                      disabled={!connected || isSubmitting || isLoadingProducts}
                                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                    >
                                <option value="" disabled>
                                  {products.length ? 'Select a product' : 'Loading...'}
                                </option>
                      {products.map((p) => (
                                  <option key={p.id} value={p.id}>Product {p.id}</option>
                      ))}
                    </select>
                  </div>

                            {/* PNR Field */}
                            <FormField
                              label="PNR (Optional)"
                      value={pnr}
                      onChange={(e) => {
                        setPnr(e.target.value.toUpperCase());
                        if (e.target.value.length !== 6) {
                          setPnrStatus(null);
                          setFetchedPassenger(null);
                                }
                              }}
                              placeholder="6-character code"
                              disabled={!connected || isSubmitting || pnrStatus === "found"}
                              helperText={
                                pnrStatus === "fetching" ? "Fetching PNR details..." :
                                pnrStatus === "found" ? "✓ PNR found, details auto-filled" :
                                pnrStatus === "not-found" ? "PNR not found, enter manually" :
                                "Enter your 6-character PNR for auto-fill"
                              }
                    />
                  </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              label="Flight Number"
                              required
                              value={flightNumber}
                              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                              placeholder="e.g., AI202, AP986"
                              disabled={!connected || isSubmitting || pnrStatus === "found"}
                            />

                            <FormField
                              label="Departure Date"
                              required
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      disabled={!connected || isSubmitting || pnrStatus === "found"}
                    />
                  </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-text-primary">
                                Departure Time *
                  </label>
                    <select
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      disabled={!connected || isSubmitting || pnrStatus === "found"}
                                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                    >
                      <option value="" disabled>Select time</option>
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

                        {/* Passenger Info (if PNR found) */}
                        <AnimatePresence>
                          {fetchedPassenger && pnrStatus === "found" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="rounded-lg border border-accent-success/20 bg-accent-success/5 p-4"
                            >
                              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-accent-success" />
                                Passenger Details (Auto-filled)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                                  <span className="text-text-tertiary">Name:</span>{' '}
                                  <span className="text-text-primary font-medium">
                                    {fetchedPassenger.fullName || fetchedPassenger.full_name || 'N/A'}
                                  </span>
                    </div>
                                {fetchedPassenger.email && (
                    <div>
                                    <span className="text-text-tertiary">Email:</span>{' '}
                                    <span className="text-text-primary font-medium">{fetchedPassenger.email}</span>
                      </div>
                    )}
                      </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t border-dark-border">
              <button
                onClick={handleBuy}
              disabled={!productId || !flightNumber || !departureDate || !departureTime || isSubmitting || !connected}
                            className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                              </>
                            ) : (
                              "Purchase Insurance"
                            )}
              </button>
            </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showBuyForm && (
                  <p className="text-gray-400 text-sm">
                    Protect your flight with instant, automated delay insurance. Click "Buy Policy" to get started.
                  </p>
                )}
              </motion.section>

              {/* My Policies Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-black border border-dark-border rounded-2xl p-6 md:p-8"
              >
          <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">My Policies</h2>
                  {myPolicies.length > 0 && (
                    <span className="ml-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/30">
                      {myPolicies.length}
                    </span>
                  )}
          </div>

          {!connected ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="Connect Your Wallet"
                    description="Connect your wallet to view your insurance policies"
                  />
          ) : isLoadingPolicies ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <SkeletonCard key={i} />
              ))}
            </div>
          ) : myPolicies.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No Policies Yet"
                    description="Purchase your first flight delay insurance policy to get started"
                    action={{
                      label: "Buy Policy",
                      onClick: () => setShowBuyForm(true)
                    }}
                  />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myPolicies.map((p) => {
                const toNum = (v: any) => Number((v ?? 0).toString());
                const policyId = toNum(p.id);
                const productIdAttr = toNum(p.product_id);
                const dep = toNum(p.departure_time);
                const premium6 = toNum(p.premium_paid);
                const coverage6 = toNum(p.coverage_amount);

                      let status: 'Active' | 'PaidOut' | 'Expired' = 'Active';
                      if (p.status) {
                        if (p.status.Active !== undefined || p.status.active !== undefined) {
                          status = 'Active';
                        } else if (p.status.PaidOut !== undefined || p.status.paidOut !== undefined || p.status.paid_out !== undefined) {
                          status = 'PaidOut';
                        } else if (p.status.Expired !== undefined || p.status.expired !== undefined) {
                          status = 'Expired';
                        } else if (typeof p.status === 'string') {
                          const statusStr = p.status as string;
                          if (statusStr.toLowerCase().includes('active')) status = 'Active';
                          else if (statusStr.toLowerCase().includes('paid')) status = 'PaidOut';
                          else if (statusStr.toLowerCase().includes('expired')) status = 'Expired';
                        } else {
                          const keys = Object.keys(p.status);
                          if (keys.length > 0) {
                            const key = keys[0];
                            if (key.toLowerCase().includes('active')) status = 'Active';
                            else if (key.toLowerCase().includes('paid')) status = 'PaidOut';
                            else if (key.toLowerCase().includes('expired')) status = 'Expired';
                          }
                        }
                      }

                      const departureIso = new Date(dep * 1000).toISOString();
                const premiumUsd = (premium6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                const coverageUsd = (coverage6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

                const ep = connection.rpcEndpoint || '';
                const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
                      const explorerUrl = `https://explorer.solana.com/address/${publicKey?.toString()}?cluster=${cluster}`;

                return (
                  <PolicyCard
                    key={policyId}
                    policyId={policyId}
                    status={status}
                    productId={productIdAttr}
                          flight={p.flight_number || ''}
                          departureIso={departureIso}
                    premiumUsd={premiumUsd}
                    coverageUsd={coverageUsd}
                    explorerUrl={explorerUrl}
                          onOpen={() => openPolicyModal(p)}
                  />
                );
              })}
                </div>
              )}
              </motion.section>
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Product Details Card */}
              {selectedProductInfo && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <ProductStatsCard productInfo={selectedProductInfo} />
                </motion.div>
              )}

              {/* Info Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-black border border-dark-border rounded-xl p-6"
              >
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                  How It Works
                </h4>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1 font-semibold">1.</span>
                    <span>Select an insurance product and enter your flight details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1 font-semibold">2.</span>
                    <span>Pay the premium in USDC through your connected wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1 font-semibold">3.</span>
                    <span>Receive a policy NFT as proof of your coverage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1 font-semibold">4.</span>
                    <span>Get automatic USDC payouts if your flight is delayed beyond the threshold</span>
                  </li>
                </ul>
              </motion.div>
                </div>
              </div>
      </div>
    </main>

      {/* Policy Modal */}
      <PolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        data={policyModalData}
      />
    </>
  );
}

