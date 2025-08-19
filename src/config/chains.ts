import { ChainConfig } from '../types/index.js';

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    currency: 'ETH',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon.llamarpc.com',
    currency: 'MATIC',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://base.llamarpc.com',
    currency: 'ETH',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arbitrum.llamarpc.com',
    currency: 'ETH',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  {
    id: 10,
    name: 'Optimism',
    rpcUrl: 'https://optimism.llamarpc.com',
    currency: 'ETH',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
];

export function getChainById(id: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
}

export function getChainByName(name: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.name.toLowerCase() === name.toLowerCase());
}