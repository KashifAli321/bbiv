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
  logo?: string;
}

export const NETWORKS: Record<string, Network> = {
  // Testnets
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    symbol: 'SepoliaETH',
    decimals: 18,
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  goerli: {
    id: 'goerli',
    name: 'Goerli',
    chainId: 5,
    rpcUrl: 'https://rpc.ankr.com/eth_goerli',
    symbol: 'GoerliETH',
    decimals: 18,
    blockExplorer: 'https://goerli.etherscan.io',
    isTestnet: true,
  },
  mumbai: {
    id: 'mumbai',
    name: 'Polygon Mumbai',
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://mumbai.polygonscan.com',
    isTestnet: true,
  },
  bscTestnet: {
    id: 'bscTestnet',
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    symbol: 'tBNB',
    decimals: 18,
    blockExplorer: 'https://testnet.bscscan.com',
    isTestnet: true,
  },
  // Mainnets
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://cloudflare-eth.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    symbol: 'BNB',
    decimals: 18,
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
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
};

export const TESTNET_IDS = Object.entries(NETWORKS)
  .filter(([_, n]) => n.isTestnet)
  .map(([id]) => id);

export const MAINNET_IDS = Object.entries(NETWORKS)
  .filter(([_, n]) => !n.isTestnet)
  .map(([id]) => id);

export const DEFAULT_NETWORK = 'sepolia';
