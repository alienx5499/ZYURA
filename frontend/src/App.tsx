"use client";
import { memo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider, useWallet } from "@/contexts/WalletContext"
// Dashboard removed
import LandingPage from "@/components/LandingPage"
import { DevProvider } from "@/contexts/DevContext"
import { DevPanel } from "@/components/ui/DevPanel"
import { Toaster } from "@/components/ui/sonner"

// Protected Route Component
const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWallet();
  return isConnected ? <>{children}</> : <Navigate to="/" replace />;
});

// Main App Content Component
const AppContent = memo(function AppContent() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Dashboard route removed */}
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

export { App };

export default App;