// Local credential storage for signed credentials
// Owner uses signature-based credentials, others use smart contract

import { ethers } from 'ethers';
import { OWNER_ISSUER_ADDRESS, isOwnerIssuer } from './issuer-config';

export interface StoredCredential {
  citizenAddress: string;
  credentialHash: string;
  signature: string;
  issuerAddress: string;
  issuedAt: number;
  fullName: string;
  dateOfBirth: string;
  nationalId: string;
  expiryDate: string;
  faceDescriptor?: number[];
}

const CREDENTIALS_KEY = 'issued_credentials';

// Get all stored credentials
export function getStoredCredentials(): StoredCredential[] {
  const stored = localStorage.getItem(CREDENTIALS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save a credential
export function saveCredential(credential: StoredCredential): void {
  const credentials = getStoredCredentials();
  
  // Remove existing credential for this citizen if any
  const filtered = credentials.filter(c => 
    c.citizenAddress.toLowerCase() !== credential.citizenAddress.toLowerCase()
  );
  
  filtered.push(credential);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(filtered));
}

// Get credential for a citizen
export function getCredentialForCitizen(citizenAddress: string): StoredCredential | null {
  const credentials = getStoredCredentials();
  return credentials.find(c => 
    c.citizenAddress.toLowerCase() === citizenAddress.toLowerCase()
  ) || null;
}

// Sign and issue credential (for owner issuer)
export async function signAndIssueCredential(
  privateKey: string,
  citizenAddress: string,
  credentialData: {
    fullName: string;
    dateOfBirth: string;
    nationalId: string;
    expiryDate: string;
    faceDescriptor?: number[];
  }
): Promise<{ success: boolean; credential?: StoredCredential; error?: string }> {
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    // Create credential hash
    const dataToHash = JSON.stringify({
      citizenAddress,
      ...credentialData,
      issuer: wallet.address,
      issuedAt: Date.now()
    });
    const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(dataToHash));
    
    // Sign the credential hash
    const signature = await wallet.signMessage(ethers.getBytes(credentialHash));
    
    const credential: StoredCredential = {
      citizenAddress,
      credentialHash,
      signature,
      issuerAddress: wallet.address,
      issuedAt: Date.now(),
      fullName: credentialData.fullName,
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: credentialData.nationalId,
      expiryDate: credentialData.expiryDate,
      faceDescriptor: credentialData.faceDescriptor
    };
    
    saveCredential(credential);
    
    return { success: true, credential };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to issue credential' };
  }
}

// Verify a credential signature
export function verifyCredentialSignature(credential: StoredCredential): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(credential.credentialHash),
      credential.signature
    );
    
    // Check if signed by owner or the stored issuer
    return (
      recoveredAddress.toLowerCase() === OWNER_ISSUER_ADDRESS.toLowerCase() ||
      recoveredAddress.toLowerCase() === credential.issuerAddress.toLowerCase()
    );
  } catch {
    return false;
  }
}

// Verify credential for a citizen address
export function verifyCredentialForCitizen(citizenAddress: string): {
  isValid: boolean;
  credential?: StoredCredential;
  error?: string;
} {
  const credential = getCredentialForCitizen(citizenAddress);
  
  if (!credential) {
    return { isValid: false, error: 'No credential found for this address' };
  }
  
  // Check expiry
  const expiryDate = new Date(credential.expiryDate);
  if (expiryDate < new Date()) {
    return { isValid: false, credential, error: 'Credential has expired' };
  }
  
  // Verify signature
  const signatureValid = verifyCredentialSignature(credential);
  if (!signatureValid) {
    return { isValid: false, credential, error: 'Invalid signature' };
  }
  
  return { isValid: true, credential };
}