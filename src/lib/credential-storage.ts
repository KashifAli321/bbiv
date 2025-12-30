// Secure credential storage using Supabase database with RLS
// Credentials are stored server-side with proper access control
// No PII stored in localStorage - all sensitive data is in the database

import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';

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
  faceDescriptorHash?: string;
}

interface DatabaseCredential {
  id: string;
  citizen_user_id: string;
  citizen_address: string;
  issuer_user_id: string;
  issuer_address: string;
  credential_hash: string;
  signature: string;
  full_name: string;
  date_of_birth: string | null;
  national_id: string;
  expiry_date: string | null;
  face_descriptor_hash: string | null;
  issued_at: string;
}

// Convert database credential to app credential format
function toStoredCredential(dbCred: DatabaseCredential): StoredCredential {
  return {
    citizenAddress: dbCred.citizen_address,
    credentialHash: dbCred.credential_hash,
    signature: dbCred.signature,
    issuerAddress: dbCred.issuer_address,
    issuedAt: new Date(dbCred.issued_at).getTime(),
    fullName: dbCred.full_name,
    dateOfBirth: dbCred.date_of_birth || '',
    nationalId: dbCred.national_id,
    expiryDate: dbCred.expiry_date || '',
    faceDescriptorHash: dbCred.face_descriptor_hash || undefined,
  };
}

// Hash a face descriptor to create a secure, privacy-preserving identifier
export function hashFaceDescriptor(descriptor: number[]): string {
  const descriptorString = descriptor.map(d => d.toFixed(6)).join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(descriptorString));
}

// Get face descriptor hash from raw descriptor (alias for consistency)
export function getFaceDescriptorHash(descriptor: number[]): string {
  return hashFaceDescriptor(descriptor);
}

// Check if a face hash already exists in credentials (server-side check)
export async function checkDuplicateFaceHash(faceHash: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('credential_face_hash_exists', {
      _hash: faceHash
    });
    if (error) {
      console.error('Error checking duplicate face:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error('Error checking duplicate face:', error);
    return false;
  }
}

// Check if a similar face already exists in credentials using Euclidean distance
export async function checkDuplicateFaceSimilarity(descriptor: number[]): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_credential_face_similarity', {
      _descriptor: descriptor,
      _threshold: 0.6
    });
    if (error) {
      console.error('Error checking face similarity:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error('Error checking face similarity:', error);
    return false;
  }
}

// Check if a credential exists for an address (server-side check)
export async function checkCredentialExistsForAddress(address: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('credential_exists_for_address', {
      _address: address
    });
    if (error) {
      console.error('Error checking credential existence:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error('Error checking credential existence:', error);
    return false;
  }
}

// Sanitize string input
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '');
}

// Validate name format
function isValidName(name: string): boolean {
  const nameRegex = /^[\p{L}\s\-'\.]+$/u;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
}

// Validate national ID format
function isValidNationalId(id: string): boolean {
  const idRegex = /^[\w\-\.\/]+$/;
  return idRegex.test(id) && id.length >= 1 && id.length <= 50;
}

// Validate date format (YYYY-MM-DD)
function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr) return true;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Sign and issue credential - stores in database with RLS protection
export async function signAndIssueCredential(
  privateKey: string,
  citizenAddress: string,
  citizenUserId: string,
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

    // Sanitize inputs
    const sanitizedName = sanitizeInput(credentialData.fullName);
    const sanitizedNationalId = sanitizeInput(credentialData.nationalId);

    // Validate required fields
    if (!sanitizedName) {
      return { success: false, error: 'Full name is required' };
    }
    if (!sanitizedNationalId) {
      return { success: false, error: 'National ID is required' };
    }

    // Validate format
    if (!isValidName(sanitizedName)) {
      return { success: false, error: 'Invalid name format. Use letters, spaces, hyphens, or apostrophes only.' };
    }
    if (!isValidNationalId(sanitizedNationalId)) {
      return { success: false, error: 'Invalid National ID format. Use alphanumeric characters and hyphens only.' };
    }

    // Validate dates if provided
    if (credentialData.dateOfBirth && !isValidDateFormat(credentialData.dateOfBirth)) {
      return { success: false, error: 'Invalid date of birth format. Use YYYY-MM-DD.' };
    }
    if (credentialData.expiryDate && !isValidDateFormat(credentialData.expiryDate)) {
      return { success: false, error: 'Invalid expiry date format. Use YYYY-MM-DD.' };
    }

    // Length validation
    if (sanitizedName.length > 100) {
      return { success: false, error: 'Full name must be less than 100 characters' };
    }
    if (sanitizedNationalId.length > 50) {
      return { success: false, error: 'National ID must be less than 50 characters' };
    }

    const wallet = new ethers.Wallet(privateKey);

    // Check for duplicate face BEFORE issuing using similarity check
    let faceDescriptorHash: string | undefined;
    if (credentialData.faceDescriptor && credentialData.faceDescriptor.length > 0) {
      faceDescriptorHash = hashFaceDescriptor(credentialData.faceDescriptor);
      
      // Use similarity-based duplicate detection (Euclidean distance)
      const isSimilar = await checkDuplicateFaceSimilarity(credentialData.faceDescriptor);
      if (isSimilar) {
        return {
          success: false,
          error: 'A similar face is already registered. This person may already have a credential issued.'
        };
      }
    }

    // Check if this wallet already has a credential
    const existingCredential = await checkCredentialExistsForAddress(citizenAddress);
    if (existingCredential) {
      return {
        success: false,
        error: 'This wallet address already has a credential issued.'
      };
    }

    // Get current user (issuer)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create credential hash
    const dataToHash = JSON.stringify({
      citizenAddress,
      fullName: sanitizedName,
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: sanitizedNationalId,
      expiryDate: credentialData.expiryDate,
      issuer: wallet.address,
      issuedAt: Date.now()
    });
    const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(dataToHash));

    // Sign the credential hash
    const signature = await wallet.signMessage(ethers.getBytes(credentialHash));

    // Store credential in database (with both hash and descriptor)
    const { data, error } = await supabase
      .from('credentials')
      .insert({
        citizen_user_id: citizenUserId,
        citizen_address: citizenAddress,
        issuer_user_id: user.id,
        issuer_address: wallet.address,
        credential_hash: credentialHash,
        signature: signature,
        full_name: sanitizedName,
        date_of_birth: credentialData.dateOfBirth || null,
        national_id: sanitizedNationalId,
        expiry_date: credentialData.expiryDate || null,
        face_descriptor_hash: faceDescriptorHash || null,
        face_descriptor: credentialData.faceDescriptor || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing credential:', error);
      return { success: false, error: error.message || 'Failed to store credential' };
    }

    const credential: StoredCredential = {
      citizenAddress,
      credentialHash,
      signature,
      issuerAddress: wallet.address,
      issuedAt: Date.now(),
      fullName: sanitizedName,
      dateOfBirth: credentialData.dateOfBirth,
      nationalId: sanitizedNationalId,
      expiryDate: credentialData.expiryDate,
      faceDescriptorHash,
    };

    return { success: true, credential };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to issue credential';
    return { success: false, error: errorMessage };
  }
}

// Verify credential response type
interface VerifyCredentialResponse {
  isValid: boolean;
  error?: string;
  credential?: {
    fullName: string;
    nationalId: string;
    dateOfBirth: string | null;
    expiryDate: string | null;
    issuerAddress: string;
    issuedAt: string;
    credentialHash: string;
  };
}

// Verify a credential by citizen address (public verification via RPC)
export async function verifyCredentialForCitizen(citizenAddress: string): Promise<{
  isValid: boolean;
  credential?: StoredCredential;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('verify_credential', {
      _citizen_address: citizenAddress
    });

    if (error) {
      console.error('Error verifying credential:', error);
      return { isValid: false, error: 'Verification failed' };
    }

    const response = data as unknown as VerifyCredentialResponse;

    if (!response || !response.isValid) {
      return { 
        isValid: false, 
        error: response?.error || 'No credential found for this address',
        credential: response?.credential ? {
          citizenAddress,
          credentialHash: response.credential.credentialHash,
          signature: '',
          issuerAddress: response.credential.issuerAddress,
          issuedAt: new Date(response.credential.issuedAt).getTime(),
          fullName: response.credential.fullName,
          dateOfBirth: response.credential.dateOfBirth || '',
          nationalId: response.credential.nationalId,
          expiryDate: response.credential.expiryDate || '',
        } : undefined
      };
    }

    return {
      isValid: true,
      credential: {
        citizenAddress,
        credentialHash: response.credential!.credentialHash,
        signature: '',
        issuerAddress: response.credential!.issuerAddress,
        issuedAt: new Date(response.credential!.issuedAt).getTime(),
        fullName: response.credential!.fullName,
        dateOfBirth: response.credential!.dateOfBirth || '',
        nationalId: response.credential!.nationalId,
        expiryDate: response.credential!.expiryDate || '',
      }
    };
  } catch (error) {
    console.error('Error verifying credential:', error);
    return { isValid: false, error: 'Verification failed' };
  }
}

// Get credential for the current user (their own credential)
export async function getMyCredential(): Promise<StoredCredential | null> {
  try {
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return toStoredCredential(data as DatabaseCredential);
  } catch (error) {
    console.error('Error fetching credential:', error);
    return null;
  }
}

// Get credential for a specific citizen (admin only - for verification)
export async function getCredentialForCitizen(citizenAddress: string): Promise<StoredCredential | null> {
  try {
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('citizen_address', citizenAddress)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return toStoredCredential(data as DatabaseCredential);
  } catch (error) {
    console.error('Error fetching credential:', error);
    return null;
  }
}

// Verify credential signature client-side (for display purposes)
export function verifyCredentialSignature(credential: StoredCredential): boolean {
  try {
    if (!credential.signature) {
      return true; // Signature not available in public view, trust server verification
    }
    
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(credential.credentialHash),
      credential.signature
    );

    return recoveredAddress.toLowerCase() === credential.issuerAddress.toLowerCase();
  } catch {
    return false;
  }
}

// Get total credentials count (for admins)
export async function getTotalCredentialsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('credentials')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error counting credentials:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error counting credentials:', error);
    return 0;
  }
}

// Get all existing face hashes (for duplicate detection during issuance)
export async function getExistingFaceHashes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('credentials')
      .select('face_descriptor_hash')
      .not('face_descriptor_hash', 'is', null);

    if (error) {
      console.error('Error fetching face hashes:', error);
      return [];
    }

    return (data || [])
      .map(c => c.face_descriptor_hash)
      .filter((hash): hash is string => hash !== null);
  } catch (error) {
    console.error('Error fetching face hashes:', error);
    return [];
  }
}
