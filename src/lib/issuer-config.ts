// Owner/Issuer configuration
// This is the default authorized issuer address (project owner)
// Others must deploy their own contract to become issuers

import { ethers } from 'ethers';

// Derive owner address from the known private key
const OWNER_PRIVATE_KEY = '0x3b7f2318bb049d8e5c8adc5c1f1b267745a9311f0ca337b7091f87e19cb01d92';
const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY);

export const OWNER_ISSUER_ADDRESS = ownerWallet.address;

// Check if an address is the owner issuer
export function isOwnerIssuer(address: string): boolean {
  return address.toLowerCase() === OWNER_ISSUER_ADDRESS.toLowerCase();
}

// Check if user has deployed their own contract
export function hasDeployedContract(): boolean {
  return !!localStorage.getItem('deployed_contract_address');
}

// Check if an address is authorized to issue credentials
export function isAuthorizedIssuer(address: string): boolean {
  // Owner is always authorized
  if (isOwnerIssuer(address)) {
    return true;
  }
  
  // Others need to deploy their own contract
  const deployedAddress = localStorage.getItem('deployed_contract_address');
  return !!deployedAddress;
}

// Get the issuer status message
export function getIssuerStatus(address: string): { authorized: boolean; message: string } {
  if (isOwnerIssuer(address)) {
    return {
      authorized: true,
      message: 'You are the authorized owner issuer'
    };
  }
  
  if (hasDeployedContract()) {
    return {
      authorized: true,
      message: 'You have deployed your own contract'
    };
  }
  
  return {
    authorized: false,
    message: 'Deploy your own contract to become an issuer'
  };
}
