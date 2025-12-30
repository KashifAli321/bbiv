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
    rpcUrl: 'https://1rpc.io/sepolia',
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
    rpcUrl: 'https://1rpc.io/holesky',
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
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
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
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://sepolia.basescan.org',
    isTestnet: true,
    faucetUrl: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
  },
  // Mainnets
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://1rpc.io/eth',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://1rpc.io/matic',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://1rpc.io/bnb',
    symbol: 'BNB',
    decimals: 18,
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://1rpc.io/arb',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://1rpc.io/op',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://1rpc.io/avax/c',
    symbol: 'AVAX',
    decimals: 18,
    blockExplorer: 'https://snowtrace.io',
    isTestnet: false,
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://1rpc.io/base',
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
