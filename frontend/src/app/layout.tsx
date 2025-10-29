import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletConnectionProvider } from "@/contexts/WalletConnectionProvider";
import { DevProvider } from "@/contexts/DevContext";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

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
  title: "ZYURA - Instant, Fair, Community-Owned Flight Delay Insurance",
  description: "Instant, automated USDC payouts for flight delays on Solana. No claims forms, no adjusters—just transparent, community-governed protection powered by smart contracts and oracle data.",
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
