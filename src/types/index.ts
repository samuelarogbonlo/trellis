export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  currency: string;
  entryPointAddress?: string;
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  bundlerUrl?: string;
  paymasterUrl?: string;
  supportedChains: number[];
}

export interface TestTransaction {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
}

export interface TransactionResult {
  provider: string;
  chain: string;
  success: boolean;
  gasUsed?: bigint;
  gasCost?: bigint;
  actualCost?: bigint;
  hiddenFees?: bigint;
  executionTime?: number;
  errorMessage?: string;
  mevRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
}

export interface ProviderStats {
  provider: string;
  chain: string;
  successRate: number;
  averageGasCost: bigint;
  averageExecutionTime: number;
  totalTests: number;
  lastUpdated: number;
}

export interface DebugConfig {
  providers: ProviderConfig[];
  chains: ChainConfig[];
  testTransaction: TestTransaction;
  iterations?: number;
  timeout?: number;
}