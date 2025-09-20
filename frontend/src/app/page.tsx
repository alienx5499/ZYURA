"use client";
import { memo } from "react";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider, useWallet } from "@/contexts/WalletContext"
import LandingPage from "@/components/LandingPage"
import { DevProvider } from "@/contexts/DevContext"
import { DevPanel } from "@/components/ui/DevPanel"
import { Toaster } from "@/components/ui/sonner"

// Main App Content Component
const AppContent = memo(function AppContent() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DevPanel />
      </Router>
      <Toaster />
    </>
  );
});

// Main App Component with Wallet Provider
const App = memo(function App() {
  return (
    <DevProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </DevProvider>
  );
});

export default function Home() {
  return <App />;
}
