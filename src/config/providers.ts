import { ProviderConfig } from '../types/index.js';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    name: 'Pimlico',
    bundlerUrl: 'https://api.pimlico.io/v2/{chainId}/rpc',
    paymasterUrl: 'https://api.pimlico.io/v2/{chainId}/rpc',
    supportedChains: [1, 137, 8453, 42161, 10],
  },
  {
    name: 'Alchemy',
    bundlerUrl: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
    paymasterUrl: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
    supportedChains: [1, 137, 8453, 42161, 10],
  },
  {
    name: 'Biconomy',
    bundlerUrl: 'https://bundler.biconomy.io/api/v2/{chainId}/{apiKey}',
    paymasterUrl: 'https://paymaster.biconomy.io/api/v1/{chainId}/{apiKey}',
    supportedChains: [1, 137, 8453, 42161, 10],
  },
  {
    name: 'Gelato',
    bundlerUrl: 'https://api.gelato.digital/bundler/{chainId}',
    paymasterUrl: 'https://api.gelato.digital/paymaster/{chainId}',
    supportedChains: [1, 137, 8453, 42161, 10],
  },
];

export function getProviderByName(name: string): ProviderConfig | undefined {
  return DEFAULT_PROVIDERS.find((provider) => provider.name.toLowerCase() === name.toLowerCase());
}

export function getProvidersForChain(chainId: number): ProviderConfig[] {
  return DEFAULT_PROVIDERS.filter((provider) => provider.supportedChains.includes(chainId));
}