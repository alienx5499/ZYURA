import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletConnectionProvider } from "@/contexts/WalletConnectionProvider";
import { DevProvider } from "@/contexts/DevContext";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { StructuredData } from "@/components/StructuredData";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ZYURA - Instant, Fair, Community-Owned Flight Delay Insurance",
    template: "%s | ZYURA",
  },
  description: "ZYURA provides instant, automated USDC payouts for flight delays on Solana blockchain. Parametric insurance with no claims forms, no adjusters, and sub-second payouts. Transparent, community-governed flight delay protection powered by smart contracts, Switchboard oracles, and Solana's high-speed blockchain. Purchase coverage, receive soulbound NFT policy proof, and get automatic compensation when delays exceed thresholds.",
  keywords: [
    "flight delay insurance",
    "travel insurance",
    "Solana",
    "DeFi insurance",
    "parametric insurance",
    "USDC payouts",
    "blockchain insurance",
    "instant claims",
    "flight protection",
    "crypto insurance",
    "smart contract insurance",
    "oracle-based insurance",
    "community-owned insurance",
    "transparent insurance",
    "automated payouts",
    "Switchboard oracle",
    "soulbound NFT",
    "risk pool",
    "liquidity provider",
    "instant compensation",
    "flight delay compensation",
    "automated insurance",
    "on-chain insurance",
    "Solana DeFi",
    "parametric flight insurance",
    "oracle-verified delays",
    "sub-second payouts",
    "community governance",
    "transparent payouts",
    "no claims process",
  ],
  authors: [{ name: "ZYURA Team" }],
  creator: "ZYURA",
  publisher: "ZYURA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://zyura.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://zyura.vercel.app",
    siteName: "ZYURA",
    title: "ZYURA - Instant, Fair, Community-Owned Flight Delay Insurance",
    description: "Instant, automated USDC payouts for flight delays on Solana. Parametric insurance with no claims forms, no adjusters, and sub-second payouts. Transparent, community-governed protection powered by smart contracts and Switchboard oracles.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "ZYURA - Flight Delay Insurance on Solana Blockchain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZYURA - Instant Flight Delay Insurance on Solana",
    description: "Get instant USDC payouts for flight delays. Parametric insurance with automated smart contracts. No paperwork, no waiting, no claims forms. Transparent, community-governed protection on Solana blockchain.",
    images: ["/logo.svg"],
    creator: "@alienX5499",
    site: "@alienX5499",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
  verification: {
    google: "b9xmyw6Dr-fOV_uysiuKNLTi1Z1DiQZ9oTFLNZvCBvg",
  },
  category: "finance",
  applicationName: "ZYURA",
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <StructuredData />
        <DevProvider>
          <WalletConnectionProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <Analytics />
            </AuthProvider>
          </WalletConnectionProvider>
        </DevProvider>
      </body>
    </html>
  );
}
