// Smart contract ABIs and addresses for identity verification

// Default contract address (placeholder - user should deploy their own)
const DEFAULT_CONTRACT_ADDRESS = '0xfB5E4033246E11851d9AC9f19109F734400f2Fc0';

// Get the deployed contract address (checks localStorage first)
export function getCredentialContractAddress(): string {
  const deployedAddress = localStorage.getItem('deployed_contract_address');
  return deployedAddress || DEFAULT_CONTRACT_ADDRESS;
}

// For backward compatibility
export const CREDENTIAL_CONTRACT_ADDRESS = getCredentialContractAddress();

export const CREDENTIAL_CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'citizen', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'hash', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'blockTimestamp', type: 'uint256' },
    ],
    name: 'CredentialIssued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'citizen', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'blockTimestamp', type: 'uint256' },
    ],
    name: 'CredentialRevoked',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: '_citizen', type: 'address' },
      { internalType: 'bytes32', name: '_hash', type: 'bytes32' },
    ],
    name: 'issueCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_citizen', type: 'address' }],
    name: 'revokeCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'credentials',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'issuer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_citizen', type: 'address' },
      { internalType: 'bytes32', name: '_hash', type: 'bytes32' },
    ],
    name: 'verifyCredential',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Sample smart contract source code for reference
export const CREDENTIAL_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IdentityCredential {
    address public issuer;
    
    mapping(address => bytes32) public credentials;
    
    event CredentialIssued(address indexed citizen, bytes32 indexed hash, uint256 blockTimestamp);
    event CredentialRevoked(address indexed citizen, uint256 blockTimestamp);
    
    constructor() {
        issuer = msg.sender;
    }
    
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer can perform this action");
        _;
    }
    
    function issueCredential(address _citizen, bytes32 _hash) external onlyIssuer {
        require(credentials[_citizen] == bytes32(0), "Credential already exists");
        credentials[_citizen] = _hash;
        emit CredentialIssued(_citizen, _hash, block.timestamp);
    }
    
    function revokeCredential(address _citizen) external onlyIssuer {
        require(credentials[_citizen] != bytes32(0), "No credential to revoke");
        delete credentials[_citizen];
        emit CredentialRevoked(_citizen, block.timestamp);
    }
    
    function verifyCredential(address _citizen, bytes32 _hash) external view returns (bool) {
        return credentials[_citizen] == _hash && _hash != bytes32(0);
    }
}
`;
