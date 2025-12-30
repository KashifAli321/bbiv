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
  faceDescriptor?: number[]; // Face embedding for matching
  faceImage?: string; // Base64 face image (thumbnail)
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

// Calculate Euclidean distance between two face descriptors
function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

// Check if a face matches any existing credential
// Returns the matching credential if found, null otherwise
export function findMatchingFace(
  faceDescriptor: number[], 
  threshold: number = 0.6
): StoredCredential | null {
  const credentials = getStoredCredentials();
  
  for (const credential of credentials) {
    if (credential.faceDescriptor && credential.faceDescriptor.length > 0) {
      const distance = euclideanDistance(faceDescriptor, credential.faceDescriptor);
      // Lower distance = more similar faces
      // Typical threshold for face-api.js is 0.6
      if (distance < threshold) {
        return credential;
      }
    }
  }
  
  return null;
}

// Check if a face already exists in the system
export function checkDuplicateFace(faceDescriptor: number[]): {
  isDuplicate: boolean;
  existingCredential?: StoredCredential;
  message?: string;
} {
  const matching = findMatchingFace(faceDescriptor);
  
  if (matching) {
    return {
      isDuplicate: true,
      existingCredential: matching,
      message: `This person already has a credential issued to wallet ${matching.citizenAddress.slice(0, 10)}...`
    };
  }
  
  return { isDuplicate: false };
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
    faceImage?: string;
  }
): Promise<{ success: boolean; credential?: StoredCredential; error?: string }> {
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    // Check for duplicate face BEFORE issuing
    if (credentialData.faceDescriptor && credentialData.faceDescriptor.length > 0) {
      const duplicateCheck = checkDuplicateFace(credentialData.faceDescriptor);
      if (duplicateCheck.isDuplicate) {
        return { 
          success: false, 
          error: `Duplicate detected: ${duplicateCheck.message}. This person cannot be issued another credential.`
        };
      }
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
      fullName: credentialData.fullName,
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: credentialData.nationalId,
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
      fullName: credentialData.fullName,
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: credentialData.nationalId,
      expiryDate: credentialData.expiryDate,
      faceDescriptor: credentialData.faceDescriptor,
      faceImage: credentialData.faceImage
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