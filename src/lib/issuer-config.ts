// Owner/Issuer configuration
// Only the project owner can issue credentials

import { ethers } from 'ethers';

// Derive owner address from the known private key
const OWNER_PRIVATE_KEY = '0x3b7f2318bb049d8e5c8adc5c1f1b267745a9311f0ca337b7091f87e19cb01d92';
const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY);

export const OWNER_ISSUER_ADDRESS = ownerWallet.address;

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