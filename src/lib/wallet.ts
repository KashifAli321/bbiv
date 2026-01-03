import { ethers } from 'ethers';
import { NETWORKS, Network, DEFAULT_NETWORK } from './networks';
import { getCredentialContractAddress, CREDENTIAL_CONTRACT_ABI } from './contracts';

export interface WalletState {
  address: string;
  privateKey: string;
  network: Network;
  balance: string;
  isConnected: boolean;
}

export interface CredentialData {
  fullName: string;
  dateOfBirth: string;
  nationalId: string;
  issuedDate: string;
  expiryDate: string;
}

// Create a new wallet
export function createWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

// Import wallet from private key
export function importWallet(privateKey: string): { address: string; privateKey: string } | null {
  try {
    let formattedKey = privateKey.trim();
    if (!formattedKey.startsWith('0x')) {
      formattedKey = '0x' + formattedKey;
    }
    const wallet = new ethers.Wallet(formattedKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch (error) {
    console.error('Invalid private key:', error);
    return null;
  }
}

// Get provider for a network
export function getProvider(networkId: string = DEFAULT_NETWORK): ethers.JsonRpcProvider {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown network: ${networkId}`);
  }
  return new ethers.JsonRpcProvider(network.rpcUrl);
}

// Get balance for an address
export async function getBalance(address: string, networkId: string = DEFAULT_NETWORK): Promise<string> {
  try {
    const provider = getProvider(networkId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}

// Get balances for all networks
export async function getAllBalances(address: string): Promise<Record<string, string>> {
  const balances: Record<string, string> = {};
  
  const promises = Object.keys(NETWORKS).map(async (networkId) => {
    try {
      const balance = await getBalance(address, networkId);
      balances[networkId] = balance;
    } catch {
      balances[networkId] = '0';
    }
  });
  
  await Promise.allSettled(promises);
  return balances;
}

// Create credential hash from data
export function createCredentialHash(data: CredentialData): string {
  const jsonData = JSON.stringify(data);
  return ethers.keccak256(ethers.toUtf8Bytes(jsonData));
}

// Get signer from private key
export function getSigner(privateKey: string, networkId: string = DEFAULT_NETWORK): ethers.Wallet {
  const provider = getProvider(networkId);
  return new ethers.Wallet(privateKey, provider);
}

// Get credential contract
export function getCredentialContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contractAddress = getCredentialContractAddress();
  return new ethers.Contract(
    contractAddress,
    CREDENTIAL_CONTRACT_ABI,
    signerOrProvider
  );
}

// Issue credential on-chain
export async function issueCredential(
  privateKey: string,
  citizenAddress: string,
  credentialHash: string,
  networkId: string = 'sepolia'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = getSigner(privateKey, networkId);
    const contract = getCredentialContract(signer);
    
    const tx = await contract.issueCredential(citizenAddress, credentialHash);
    const receipt = await tx.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to issue credential' };
  }
}

// Revoke credential on-chain
export async function revokeCredential(
  privateKey: string,
  citizenAddress: string,
  networkId: string = 'sepolia'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = getSigner(privateKey, networkId);
    const contract = getCredentialContract(signer);
    
    const tx = await contract.revokeCredential(citizenAddress);
    const receipt = await tx.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke credential' };
  }
}

// Verify credential on-chain
export async function verifyCredential(
  citizenAddress: string,
  credentialHash: string,
  networkId: string = 'sepolia'
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const provider = getProvider(networkId);
    const contract = getCredentialContract(provider);
    
    const isValid = await contract.verifyCredential(citizenAddress, credentialHash);
    return { isValid };
  } catch (error: any) {
    return { isValid: false, error: error.message || 'Failed to verify credential' };
  }
}

// Get stored credential for an address
export async function getStoredCredential(
  citizenAddress: string,
  networkId: string = 'sepolia'
): Promise<string | null> {
  try {
    const provider = getProvider(networkId);
    const contract = getCredentialContract(provider);
    
    const hash = await contract.credentials(citizenAddress);
    const hashHex = hash.toString();
    
    if (hashHex === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    return hashHex;
  } catch (error) {
    console.error('Error getting credential:', error);
    return null;
  }
}

// Sign a message
export async function signMessage(privateKey: string, message: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signMessage(message);
}

// Verify a signed message
export function verifySignedMessage(message: string, signature: string): string | null {
  try {
    return ethers.verifyMessage(message, signature);
  } catch {
    return null;
  }
}

// Send transaction
export async function sendTransaction(
  privateKey: string,
  toAddress: string,
  amount: string,
  networkId: string = DEFAULT_NETWORK
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = getSigner(privateKey, networkId);
    
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });
    
    const receipt = await tx.wait();
    return { success: true, txHash: receipt?.hash };
  } catch (error: any) {
    return { success: false, error: error.message || 'Transaction failed' };
  }
}

// Truncate address for display
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format balance for display
export function formatBalance(balance: string, decimals: number = 4): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}
