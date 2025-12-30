import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NETWORKS, Network, DEFAULT_NETWORK } from '@/lib/networks';
import { getBalance, getAllBalances, createWallet, importWallet, truncateAddress } from '@/lib/wallet';

interface WalletContextType {
  address: string | null;
  privateKey: string | null;
  network: Network;
  balance: string;
  balances: Record<string, string>;
  isConnected: boolean;
  isLoading: boolean;
  setNetwork: (networkId: string) => void;
  createNewWallet: () => void;
  importFromPrivateKey: (key: string) => boolean;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// SECURITY: Use sessionStorage instead of localStorage for private keys
// Keys are cleared when the browser tab/window is closed
const STORAGE_KEY = 'blockchain_identity_wallet';
const SECURITY_WARNING_SHOWN_KEY = 'security_warning_acknowledged';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [network, setNetworkState] = useState<Network>(NETWORKS[DEFAULT_NETWORK]);
  const [balance, setBalance] = useState<string>('0');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load wallet from session storage on mount (not localStorage for security)
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.address && data.privateKey) {
          setAddress(data.address);
          setPrivateKey(data.privateKey);
          if (data.networkId && NETWORKS[data.networkId]) {
            setNetworkState(NETWORKS[data.networkId]);
          }
        }
      } catch (e) {
        console.error('Failed to load wallet from storage');
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save wallet to session storage (cleared when browser closes)
  useEffect(() => {
    if (address && privateKey) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        address,
        privateKey,
        networkId: network.id,
      }));
    }
  }, [address, privateKey, network]);

  // Refresh balance when address or network changes
  useEffect(() => {
    if (address) {
      refreshBalance();
    }
  }, [address, network]);

  const refreshBalance = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const bal = await getBalance(address, network.id);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to get balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllBalances = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const bals = await getAllBalances(address);
      setBalances(bals);
    } catch (error) {
      console.error('Failed to get balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setNetwork = (networkId: string) => {
    if (NETWORKS[networkId]) {
      setNetworkState(NETWORKS[networkId]);
    }
  };

  const createNewWallet = () => {
    const wallet = createWallet();
    setAddress(wallet.address);
    setPrivateKey(wallet.privateKey);
    setBalance('0');
  };

  const importFromPrivateKey = (key: string): boolean => {
    const wallet = importWallet(key);
    if (wallet) {
      setAddress(wallet.address);
      setPrivateKey(wallet.privateKey);
      return true;
    }
    return false;
  };

  const disconnect = () => {
    setAddress(null);
    setPrivateKey(null);
    setBalance('0');
    setBalances({});
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        privateKey,
        network,
        balance,
        balances,
        isConnected: !!address,
        isLoading,
        setNetwork,
        createNewWallet,
        importFromPrivateKey,
        disconnect,
        refreshBalance,
        refreshAllBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
