// Network configuration for multi-chain support

export interface Network {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  blockExplorer: string;
  isTestnet: boolean;
  faucetUrl?: string;
  logo?: string;
}

export const NETWORKS: Record<string, Network> = {
  // Testnets (Active ones only)
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    symbol: 'SepoliaETH',
    decimals: 18,
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    faucetUrl: 'https://sepoliafaucet.com',
  },
  holeskyTestnet: {
    id: 'holeskyTestnet',
    name: 'Holesky',
    chainId: 17000,
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://holesky.etherscan.io',
    isTestnet: true,
    faucetUrl: 'https://holesky-faucet.pk910.de',
  },
  polygonAmoy: {
    id: 'polygonAmoy',
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://amoy.polygonscan.com',
    isTestnet: true,
    faucetUrl: 'https://faucet.polygon.technology',
  },
  bscTestnet: {
    id: 'bscTestnet',
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    symbol: 'tBNB',
    decimals: 18,
    blockExplorer: 'https://testnet.bscscan.com',
    isTestnet: true,
    faucetUrl: 'https://testnet.bnbchain.org/faucet-smart',
  },
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    faucetUrl: 'https://faucet.quicknode.com/arbitrum/sepolia',
  },
  // Mainnets
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc.llamarpc.com',
    symbol: 'BNB',
    decimals: 18,
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arbitrum.llamarpc.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://optimism.llamarpc.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    symbol: 'AVAX',
    decimals: 18,
    blockExplorer: 'https://snowtrace.io',
    isTestnet: false,
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
  },
};

export const TESTNET_IDS = Object.entries(NETWORKS)
  .filter(([_, n]) => n.isTestnet)
  .map(([id]) => id);

export const MAINNET_IDS = Object.entries(NETWORKS)
  .filter(([_, n]) => !n.isTestnet)
  .map(([id]) => id);

export const DEFAULT_NETWORK = 'sepolia';
