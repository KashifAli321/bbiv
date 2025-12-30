// Local credential storage for signed credentials
// Includes face data for duplicate detection

import { ethers } from 'ethers';
import { OWNER_ISSUER_ADDRESS } from './issuer-config';

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
  // Face data stored as encrypted/obfuscated hash - not raw biometric data
  faceDescriptorHash?: string; // Hash of face descriptor for matching (not raw descriptor)
  // Note: Face thumbnail removed to protect biometric privacy
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

// Hash a face descriptor to create a secure, privacy-preserving identifier
function hashFaceDescriptor(descriptor: number[]): string {
  // Create a deterministic hash from the descriptor
  const descriptorString = descriptor.map(d => d.toFixed(6)).join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(descriptorString));
}

// Check if a face hash matches any existing credential
export function findMatchingFaceByHash(
  faceDescriptorHash: string
): StoredCredential | null {
  const credentials = getStoredCredentials();
  
  for (const credential of credentials) {
    if (credential.faceDescriptorHash === faceDescriptorHash) {
      return credential;
    }
  }
  
  return null;
}

// Check if a face already exists in the system (using hash comparison)
export function checkDuplicateFace(faceDescriptor: number[]): {
  isDuplicate: boolean;
  existingCredential?: StoredCredential;
  message?: string;
} {
  const hash = hashFaceDescriptor(faceDescriptor);
  const matching = findMatchingFaceByHash(hash);
  
  if (matching) {
    return {
      isDuplicate: true,
      existingCredential: matching,
      message: `This person already has a credential issued to wallet ${matching.citizenAddress.slice(0, 10)}...`
    };
  }
  
  return { isDuplicate: false };
}

// Get face descriptor hash from raw descriptor
export function getFaceDescriptorHash(descriptor: number[]): string {
  return hashFaceDescriptor(descriptor);
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
    // Validate Ethereum address format
    if (!ethers.isAddress(citizenAddress)) {
      return { success: false, error: 'Invalid Ethereum address format' };
    }

    // Validate required fields
    if (!credentialData.fullName?.trim()) {
      return { success: false, error: 'Full name is required' };
    }
    if (!credentialData.nationalId?.trim()) {
      return { success: false, error: 'National ID is required' };
    }
    if (credentialData.fullName.length > 100) {
      return { success: false, error: 'Full name must be less than 100 characters' };
    }
    if (credentialData.nationalId.length > 50) {
      return { success: false, error: 'National ID must be less than 50 characters' };
    }

    const wallet = new ethers.Wallet(privateKey);
    
    // Check for duplicate face BEFORE issuing
    let faceDescriptorHash: string | undefined;
    if (credentialData.faceDescriptor && credentialData.faceDescriptor.length > 0) {
      const duplicateCheck = checkDuplicateFace(credentialData.faceDescriptor);
      if (duplicateCheck.isDuplicate) {
        return { 
          success: false, 
          error: `Duplicate detected: ${duplicateCheck.message}. This person cannot be issued another credential.`
        };
      }
      // Store only the hash, not the raw descriptor
      faceDescriptorHash = getFaceDescriptorHash(credentialData.faceDescriptor);
    }
    
    // Check if this wallet already has a credential
    const existing = getCredentialForCitizen(citizenAddress);
    if (existing) {
      return {
        success: false,
        error: 'This wallet address already has a credential issued.'
      };
    }
    
    // Create credential hash
    const dataToHash = JSON.stringify({
      citizenAddress,
      fullName: credentialData.fullName.trim(),
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: credentialData.nationalId.trim(),
      expiryDate: credentialData.expiryDate,
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
      fullName: credentialData.fullName.trim(),
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: credentialData.nationalId.trim(),
      expiryDate: credentialData.expiryDate,
      faceDescriptorHash,
    };
    
    saveCredential(credential);
    
    return { success: true, credential };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to issue credential';
    return { success: false, error: errorMessage };
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
  if (credential.expiryDate) {
    const expiryDate = new Date(credential.expiryDate);
    if (expiryDate < new Date()) {
      return { isValid: false, credential, error: 'Credential has expired' };
    }
  }
  
  // Verify signature
  const signatureValid = verifyCredentialSignature(credential);
  if (!signatureValid) {
    return { isValid: false, credential, error: 'Invalid signature' };
  }
  
  return { isValid: true, credential };
}

// Get total issued credentials count
export function getTotalCredentialsCount(): number {
  return getStoredCredentials().length;
}