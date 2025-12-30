import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NETWORKS, Network, DEFAULT_NETWORK } from '@/lib/networks';
import { getBalance, getAllBalances, createWallet, importWallet, truncateAddress } from '@/lib/wallet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WalletContextType {
  address: string | null;
  privateKey: string | null;
  network: Network;
  balance: string;
  balances: Record<string, string>;
  isConnected: boolean;
  isLoading: boolean;
  hasLinkedWallet: boolean;
  setNetwork: (networkId: string) => void;
  createNewWallet: () => Promise<{ success: boolean; error?: string }>;
  importFromPrivateKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAuthenticated, updateProfile } = useAuth();
  
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [network, setNetworkState] = useState<Network>(NETWORKS[DEFAULT_NETWORK]);
  const [balance, setBalance] = useState<string>('0');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load wallet from profile when user logs in
  useEffect(() => {
    if (isAuthenticated && profile) {
      if (profile.wallet_address && profile.wallet_private_key_encrypted) {
        setAddress(profile.wallet_address);
        setPrivateKey(profile.wallet_private_key_encrypted);
      } else {
        // No wallet linked yet
        setAddress(null);
        setPrivateKey(null);
      }
    } else {
      // Not authenticated, clear wallet
      setAddress(null);
      setPrivateKey(null);
      setBalance('0');
      setBalances({});
    }
  }, [isAuthenticated, profile]);

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

  const createNewWallet = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'You must be logged in to create a wallet' };
    }

    // Check if user already has a wallet
    if (profile?.wallet_address) {
      return { success: false, error: 'You already have a wallet linked to your account. Only one wallet per account is allowed.' };
    }

    try {
      const wallet = createWallet();
      
      // Save to profile
      const { error } = await updateProfile({
        wallet_address: wallet.address,
        wallet_private_key_encrypted: wallet.privateKey
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to save wallet to your account' };
      }

      setAddress(wallet.address);
      setPrivateKey(wallet.privateKey);
      setBalance('0');
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create wallet' };
    }
  };

  const importFromPrivateKey = async (key: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'You must be logged in to import a wallet' };
    }

    // Check if user already has a wallet
    if (profile?.wallet_address) {
      return { success: false, error: 'You already have a wallet linked to your account. Only one wallet per account is allowed.' };
    }

    try {
      const wallet = importWallet(key);
      if (!wallet) {
        return { success: false, error: 'Invalid private key format' };
      }

      // Check if this wallet is already linked to another account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', wallet.address)
        .maybeSingle();

      if (existingProfile) {
        return { success: false, error: 'This wallet is already linked to another account' };
      }

      // Save to profile
      const { error } = await updateProfile({
        wallet_address: wallet.address,
        wallet_private_key_encrypted: wallet.privateKey
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to save wallet to your account' };
      }

      setAddress(wallet.address);
      setPrivateKey(wallet.privateKey);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to import wallet' };
    }
  };

  const disconnect = () => {
    // Note: We don't actually remove the wallet from profile
    // Just clear local state - wallet stays linked to account
    setAddress(null);
    setPrivateKey(null);
    setBalance('0');
    setBalances({});
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
        hasLinkedWallet: !!profile?.wallet_address,
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
