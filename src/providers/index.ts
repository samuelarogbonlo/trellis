import { BaseProvider } from './base.js';
import { PimlicoProvider } from './pimlico.js';
import { AlchemyProvider } from './alchemy.js';
import { BiconomyProvider } from './biconomy.js';
import { GelatoProvider } from './gelato.js';
import { MockProvider } from './mock.js';
import { ProviderConfig, ChainConfig } from '../types/index.js';

export function createProvider(
  config: ProviderConfig,
  chain: ChainConfig,
  useMock: boolean = false
): BaseProvider | null {
  if (useMock) {
    return new MockProvider(config, chain);
  }
  
  switch (config.name.toLowerCase()) {
    case 'pimlico':
      return new PimlicoProvider(config, chain);
    case 'alchemy':
      return new AlchemyProvider(config, chain);
    case 'biconomy':
      return new BiconomyProvider(config, chain);
    case 'gelato':
      return new GelatoProvider(config, chain);
    default:
      return null;
  }
}

export * from './base.js';
export * from './pimlico.js';
export * from './alchemy.js';
export * from './biconomy.js';
export * from './gelato.js';