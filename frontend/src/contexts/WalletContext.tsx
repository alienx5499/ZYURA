/* eslint-disable react-refresh/only-export-components */
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface WalletContextType {
  isConnected: boolean;
  account: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  signTransactions?: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
    if (!eth) return;

    const init = async () => {
      try {
        const accounts: string[] = await eth.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      } catch (err) {
        console.warn('No existing connection found');
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        setIsConnected(false);
      } else {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleChainChanged = () => {
      // Force refresh to pick up new chain
      if (typeof window !== 'undefined') window.location.reload();
    };

    init();
    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = async () => {
    try {
      setIsLoading(true);
      const eth = window.ethereum;
      if (!eth) {
        window.open('https://metamask.io/download.html', '_blank');
        throw new Error('MetaMask not found');
      }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch {
      console.error('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    // MetaMask does not support programmatic disconnect; reset local state
    setAccount(null);
    setIsConnected(false);
  };

  const value: WalletContextType = {
    isConnected,
    account,
    connect,
    disconnect,
    isLoading,
    signTransactions: async () => {
      throw new Error('signTransactions not implemented for EVM');
    },
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
