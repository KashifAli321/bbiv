// Owner/Issuer configuration
// Only the project owner can issue credentials
// SECURITY: Owner address is configured directly - private key must NEVER be in source code

// The owner's public address (derived from their private key which is kept secure)
// This address is the only one authorized to issue credentials
// Users must import their own private key at runtime via the wallet interface
export const OWNER_ISSUER_ADDRESS = '0x742d35Cc6635C0532925a3b8D42cC72b5c4c5E3B';

// Check if an address is the owner issuer
export function isOwnerIssuer(address: string): boolean {
  return address.toLowerCase() === OWNER_ISSUER_ADDRESS.toLowerCase();
}

// Only owner is authorized to issue credentials
export function isAuthorizedIssuer(address: string): boolean {
  return isOwnerIssuer(address);
}

// Get the issuer status message
export function getIssuerStatus(address: string): { authorized: boolean; message: string } {
  if (isOwnerIssuer(address)) {
    return {
      authorized: true,
      message: 'You are the authorized owner issuer'
    };
  }
  
  return {
    authorized: false,
    message: 'Only the project owner can issue credentials'
  };
}