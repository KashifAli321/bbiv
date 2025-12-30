// Wallet encryption utilities using Web Crypto API
// Private keys are encrypted client-side before storage
// The encryption key is derived from user credentials (never stored)

const SALT_KEY = 'wallet_encryption_salt';
const IV_LENGTH = 12;

// Generate a random salt for key derivation
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get or create salt for this user (stored in localStorage)
export function getUserSalt(userId: string): string {
  const key = `${SALT_KEY}_${userId}`;
  let salt = localStorage.getItem(key);
  if (!salt) {
    salt = generateSalt();
    localStorage.setItem(key, salt);
  }
  return salt;
}

// Derive encryption key from user ID and password/session token
async function deriveKey(userId: string, password: string): Promise<CryptoKey> {
  const salt = getUserSalt(userId);
  const encoder = new TextEncoder();
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt + userId),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key
export async function encryptPrivateKey(
  privateKey: string,
  userId: string,
  password: string
): Promise<string> {
  try {
    const key = await deriveKey(userId, password);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(privateKey)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt private key');
  }
}

// Decrypt private key
export async function decryptPrivateKey(
  encryptedData: string,
  userId: string,
  password: string
): Promise<string> {
  try {
    const key = await deriveKey(userId, password);
    
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt private key. Check your password.');
  }
}

// Check if a string appears to be encrypted (base64 with proper length)
export function isEncrypted(data: string): boolean {
  try {
    // Encrypted data should be base64 and longer than a raw private key
    // Raw private key is 64 hex chars (or 66 with 0x prefix)
    // Encrypted base64 will be much longer due to IV + encryption overhead
    if (data.length < 80) return false;
    
    // Try to decode as base64
    const decoded = atob(data);
    // Encrypted data should have IV (12 bytes) + at least 32 bytes of data
    return decoded.length >= 44;
  } catch {
    return false;
  }
}

// Session-based key storage (memory only, cleared on page refresh)
let sessionPassword: string | null = null;

export function setSessionPassword(password: string): void {
  sessionPassword = password;
}

export function getSessionPassword(): string | null {
  return sessionPassword;
}

export function clearSessionPassword(): void {
  sessionPassword = null;
}

// Generate a session password from user session data
export function generateSessionPassword(sessionToken: string, userId: string): string {
  // Use a combination of session token and user ID as the encryption password
  // This means the key can only be derived while the session is active
  return `${sessionToken.slice(0, 32)}_${userId}`;
}

// Generate a deterministic wallet private key from username and password
// Uses PBKDF2 with high iterations for security
export async function deriveWalletFromCredentials(
  username: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create a unique salt from username
  const salt = encoder.encode(`wallet_derivation_${username.toLowerCase().trim()}`);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive 256 bits (32 bytes) for the private key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 250000, // High iterations for security
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Convert to hex string (with 0x prefix for Ethereum)
  const privateKeyBytes = new Uint8Array(derivedBits);
  const privateKeyHex = '0x' + Array.from(privateKeyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return privateKeyHex;
}
