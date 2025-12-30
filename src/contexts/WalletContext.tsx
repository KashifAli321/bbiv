import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { NETWORKS, Network, DEFAULT_NETWORK } from '@/lib/networks';
import { getBalance, getAllBalances, createWallet, importWallet } from '@/lib/wallet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  encryptPrivateKey, 
  decryptPrivateKey, 
  isEncrypted,
  generateSessionPassword,
  setSessionPassword,
  getSessionPassword,
  clearSessionPassword
} from '@/lib/wallet-encryption';

interface WalletContextType {
  address: string | null;
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
  // Secure signing - decrypts key only when needed
  getDecryptedPrivateKey: () => Promise<string | null>;
  signWithWallet: <T>(operation: (privateKey: string) => Promise<T>) => Promise<{ success: boolean; result?: T; error?: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAuthenticated, updateProfile, session } = useAuth();
  
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetworkState] = useState<Network>(NETWORKS[DEFAULT_NETWORK]);
  const [balance, setBalance] = useState<string>('0');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get or generate session password for encryption
  const getEncryptionPassword = useCallback((): string | null => {
    if (!session?.access_token || !user?.id) return null;
    
    let password = getSessionPassword();
    if (!password) {
      password = generateSessionPassword(session.access_token, user.id);
      setSessionPassword(password);
    }
    return password;
  }, [session, user]);

  // Load wallet address (NOT private key) from profile when user logs in
  useEffect(() => {
    const loadWallet = async () => {
      if (isAuthenticated && profile && user && session) {
        if (profile.wallet_address && profile.wallet_private_key_encrypted) {
          setAddress(profile.wallet_address);
          
          // Check if we need to migrate unencrypted data
          const password = getEncryptionPassword();
          if (password && !isEncrypted(profile.wallet_private_key_encrypted)) {
            // Legacy unencrypted data - encrypt it now
            try {
              const encrypted = await encryptPrivateKey(
                profile.wallet_private_key_encrypted,
                user.id,
                password
              );
              
              // Update database with encrypted version
              await updateProfile({
                wallet_private_key_encrypted: encrypted
              });
            } catch (error) {
              console.error('Failed to migrate wallet encryption:', error);
            }
          }
        } else {
          setAddress(null);
        }
      } else {
        // Not authenticated, clear wallet and session password
        setAddress(null);
        setBalance('0');
        setBalances({});
        clearSessionPassword();
      }
    };
    
    loadWallet();
  }, [isAuthenticated, profile, user, session, getEncryptionPassword, updateProfile]);

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

  // Decrypt private key on-demand for signing operations
  // Key is only in memory during the operation and cleared after
  const getDecryptedPrivateKey = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !profile?.wallet_private_key_encrypted) {
      return null;
    }

    const password = getEncryptionPassword();
    if (!password) {
      return null;
    }

    try {
      // If not encrypted (legacy), return as-is but log warning
      if (!isEncrypted(profile.wallet_private_key_encrypted)) {
        console.warn('Using unencrypted private key - migration pending');
        return profile.wallet_private_key_encrypted;
      }

      const decrypted = await decryptPrivateKey(
        profile.wallet_private_key_encrypted,
        user.id,
        password
      );
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt wallet:', error);
      return null;
    }
  }, [user, profile, getEncryptionPassword]);

  // Secure signing wrapper - decrypts key, performs operation, key is garbage collected
  const signWithWallet = useCallback(async <T,>(
    operation: (privateKey: string) => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: string }> => {
    const privateKey = await getDecryptedPrivateKey();
    
    if (!privateKey) {
      return { success: false, error: 'Unable to access wallet. Please re-authenticate.' };
    }

    try {
      // Execute the signing operation
      // Private key is only in memory for this scope
      const result = await operation(privateKey);
      // privateKey goes out of scope here and will be garbage collected
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Operation failed' };
    }
  }, [getDecryptedPrivateKey]);

  const createNewWallet = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'You must be logged in to create a wallet' };
    }

    if (profile?.wallet_address) {
      return { success: false, error: 'You already have a wallet linked to your account. Only one wallet per account is allowed.' };
    }

    const password = getEncryptionPassword();
    if (!password) {
      return { success: false, error: 'Session not available for encryption' };
    }

    try {
      const wallet = createWallet();
      
      // Encrypt the private key before storing
      const encryptedKey = await encryptPrivateKey(wallet.privateKey, user.id, password);
      
      // Save encrypted key to profile
      const { error } = await updateProfile({
        wallet_address: wallet.address,
        wallet_private_key_encrypted: encryptedKey
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to save wallet to your account' };
      }

      setAddress(wallet.address);
      setBalance('0');
      
      // wallet.privateKey goes out of scope here - not stored in state
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create wallet' };
    }
  };

  const importFromPrivateKey = async (key: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'You must be logged in to import a wallet' };
    }

    if (profile?.wallet_address) {
      return { success: false, error: 'You already have a wallet linked to your account. Only one wallet per account is allowed.' };
    }

    const password = getEncryptionPassword();
    if (!password) {
      return { success: false, error: 'Session not available for encryption' };
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

      // Encrypt the private key before storing
      const encryptedKey = await encryptPrivateKey(wallet.privateKey, user.id, password);

      // Save encrypted key to profile
      const { error } = await updateProfile({
        wallet_address: wallet.address,
        wallet_private_key_encrypted: encryptedKey
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to save wallet to your account' };
      }

      setAddress(wallet.address);
      
      // wallet.privateKey goes out of scope here - not stored in state
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to import wallet' };
    }
  };

  const disconnect = () => {
    setAddress(null);
    setBalance('0');
    setBalances({});
  };

  return (
    <WalletContext.Provider
      value={{
        address,
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
        getDecryptedPrivateKey,
        signWithWallet,
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
