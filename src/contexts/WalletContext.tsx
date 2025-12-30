import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NETWORKS, Network, DEFAULT_NETWORK } from '@/lib/networks';
import { getBalance, getAllBalances, createWallet, importWallet, truncateAddress } from '@/lib/wallet';
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
  privateKey: string | null;
  network: Network;
  balance: string;
  balances: Record<string, string>;
  isConnected: boolean;
  isLoading: boolean;
  hasLinkedWallet: boolean;
  isDecrypting: boolean;
  setNetwork: (networkId: string) => void;
  createNewWallet: () => Promise<{ success: boolean; error?: string }>;
  importFromPrivateKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAuthenticated, updateProfile, session } = useAuth();
  
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [network, setNetworkState] = useState<Network>(NETWORKS[DEFAULT_NETWORK]);
  const [balance, setBalance] = useState<string>('0');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Get or generate session password for encryption
  const getEncryptionPassword = (): string | null => {
    if (!session?.access_token || !user?.id) return null;
    
    let password = getSessionPassword();
    if (!password) {
      password = generateSessionPassword(session.access_token, user.id);
      setSessionPassword(password);
    }
    return password;
  };

  // Load and decrypt wallet from profile when user logs in
  useEffect(() => {
    const loadWallet = async () => {
      if (isAuthenticated && profile && user && session) {
        if (profile.wallet_address && profile.wallet_private_key_encrypted) {
          setAddress(profile.wallet_address);
          
          // Decrypt the private key
          const password = getEncryptionPassword();
          if (password) {
            setIsDecrypting(true);
            try {
              // Check if data is actually encrypted or legacy plaintext
              if (isEncrypted(profile.wallet_private_key_encrypted)) {
                const decrypted = await decryptPrivateKey(
                  profile.wallet_private_key_encrypted,
                  user.id,
                  password
                );
                setPrivateKey(decrypted);
              } else {
                // Legacy unencrypted data - encrypt it now
                const encrypted = await encryptPrivateKey(
                  profile.wallet_private_key_encrypted,
                  user.id,
                  password
                );
                
                // Update database with encrypted version
                await updateProfile({
                  wallet_private_key_encrypted: encrypted
                });
                
                setPrivateKey(profile.wallet_private_key_encrypted);
              }
            } catch (error) {
              console.error('Failed to decrypt wallet:', error);
              // Don't expose the key if decryption fails
              setPrivateKey(null);
            } finally {
              setIsDecrypting(false);
            }
          }
        } else {
          setAddress(null);
          setPrivateKey(null);
        }
      } else {
        // Not authenticated, clear wallet and session password
        setAddress(null);
        setPrivateKey(null);
        setBalance('0');
        setBalances({});
        clearSessionPassword();
      }
    };
    
    loadWallet();
  }, [isAuthenticated, profile, user, session]);

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
      setPrivateKey(wallet.privateKey);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to import wallet' };
    }
  };

  const disconnect = () => {
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
        isDecrypting,
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
