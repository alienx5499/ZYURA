"use client";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
// Use same hardcoded values as dashboard (see dashboard/page.tsx line 647-648)
const GITHUB_REPO = "alienx5499/zyura-nft-metadata";
const GITHUB_BRANCH = "main";

export interface PolicyImage {
  imageUrl: string;
  policyId: string;
  flightNumber?: string;
  policyholder?: string;
}

/**
 * Fetches policy images from GitHub based on policies found on-chain
 */
export async function fetchPolicyImages(limit: number = 10): Promise<PolicyImage[]> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet"),
      "confirmed"
    );

    // Load IDL - try from public folder first, then from src
    let idlJson;
    try {
      const idlResponse = await fetch("/idl/zyura.json");
      if (idlResponse.ok) {
        idlJson = await idlResponse.json();
      } else {
        // Try importing from src
        const idlModule = await import("@/idl/zyura.json");
        idlJson = idlModule.default || idlModule;
      }
    } catch (error) {
      console.warn("Could not load IDL, using fallback images", error);
      return getFallbackImages(limit);
    }

    const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
    const disc = coder.accounts.accountDiscriminator("Policy");

    // Fetch all policy accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } }
      ],
      commitment: "confirmed"
    });

    if (accounts.length === 0) {
      console.warn("No policies found on-chain, using fallback images");
      return getFallbackImages(limit);
    }

    const policyImages: PolicyImage[] = [];

    // Process up to limit policies
    for (let i = 0; i < Math.min(accounts.length, limit); i++) {
      const acc = accounts[i];
      try {
        const decoded: any = coder.accounts.decode("Policy", acc.account.data);
        const policyId = decoded.id?.toString() || i.toString();
        const policyholder = decoded.policyholder 
          ? new PublicKey(decoded.policyholder).toString()
          : undefined;
        const flightNumber = decoded.flightNumber || undefined;

        if (!policyholder) {
          continue;
        }

        // Try multiple possible paths for metadata/SVG
        const possiblePaths = [
          `metadata/${policyholder}/${policyId}/policy.json`,
          `metadata/${policyholder}/${policyId}/policy.svg`,
          `metadata/${policyholder}/policy-${policyId}.json`,
          `metadata/${policyholder}/policy-${policyId}.svg`,
        ];

        let imageUrl: string | null = null;

        // First try to fetch JSON metadata (which contains the image URL)
        for (const path of possiblePaths.filter(p => p.endsWith('.json'))) {
          try {
            const jsonUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
            const jsonResponse = await fetch(jsonUrl);
            if (jsonResponse.ok) {
              const metadata = await jsonResponse.json();
              // Use image from metadata if available, otherwise use SVG URL
              imageUrl = metadata.image || jsonUrl.replace('.json', '.svg');
              console.log(`✅ Found policy ${policyId} metadata at ${path}`);
              break;
            }
          } catch (error) {
            // Continue to next path
          }
        }

        // If no JSON found, try SVG directly
        if (!imageUrl) {
          for (const path of possiblePaths.filter(p => p.endsWith('.svg'))) {
            try {
              const svgUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
              const svgResponse = await fetch(svgUrl, { method: "HEAD" });
              if (svgResponse.ok) {
                imageUrl = svgUrl;
                console.log(`✅ Found policy ${policyId} SVG at ${path}`);
                break;
              }
            } catch (error) {
              // Continue to next path
            }
          }
        }

        if (imageUrl) {
          policyImages.push({
            imageUrl,
            policyId,
            flightNumber,
            policyholder
          });
        } else {
          console.warn(`Policy ${policyId} image not found in GitHub`);
        }
      } catch (error) {
        console.error(`Error processing policy ${i}:`, error);
      }
    }

    // If we have some real images, return them (pad with fallbacks if needed)
    if (policyImages.length > 0) {
      // Repeat the real images to fill the limit
      while (policyImages.length < limit) {
        policyImages.push(...policyImages.slice(0, limit - policyImages.length));
      }
      return policyImages.slice(0, limit);
    }

    return getFallbackImages(limit);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return getFallbackImages(limit);
  }
}

/**
 * Returns fallback policy images (using dashboard screenshot or placeholder SVG)
 */
function getFallbackImages(limit: number): PolicyImage[] {
  const fallbackImages: PolicyImage[] = [];
  
  // Use a simple SVG placeholder for policies
  const svgString = `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" /><stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" /></linearGradient></defs><rect width="400" height="250" fill="url(#grad)"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">ZYURA Policy</text><text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">Flight Delay Insurance</text></svg>`;
  const svgPlaceholder = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

  for (let i = 0; i < limit; i++) {
    fallbackImages.push({
      imageUrl: svgPlaceholder,
      policyId: `fallback-${i}`,
      flightNumber: undefined,
      policyholder: undefined
    });
  }

  return fallbackImages;
}

