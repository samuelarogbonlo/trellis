import { createProvider } from '../providers/index.js';
import { CostAnalyzer } from '../analyzer/cost-analyzer.js';
import { StatsTracker } from '../analyzer/stats-tracker.js';
import { SUPPORTED_CHAINS, getChainById } from '../config/chains.js';
import { DEFAULT_PROVIDERS, getProvidersForChain } from '../config/providers.js';
import { 
  DebugConfig, 
  TransactionResult, 
  TestTransaction, 
  ProviderConfig,
  ChainConfig 
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';

export class GasAbstractionDebugger {
  private costAnalyzer: CostAnalyzer;
  private statsTracker: StatsTracker;
  private config: DebugConfig;

  constructor(config?: Partial<DebugConfig>) {
    this.costAnalyzer = new CostAnalyzer();
    this.statsTracker = new StatsTracker();
    this.config = this.buildConfig(config);
  }

  private buildConfig(userConfig?: Partial<DebugConfig>): DebugConfig {
    return {
      providers: userConfig?.providers || DEFAULT_PROVIDERS,
      chains: userConfig?.chains || SUPPORTED_CHAINS,
      testTransaction: userConfig?.testTransaction || {
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
      },
      iterations: userConfig?.iterations || 1,
      timeout: userConfig?.timeout || 30000,
    };
  }

  async runFullAnalysis(options?: {
    chains?: string[];
    providers?: string[];
    iterations?: number;
  }): Promise<TransactionResult[]> {
    const chains = this.getSelectedChains(options?.chains);
    const providers = this.getSelectedProviders(options?.providers);
    const iterations = options?.iterations || this.config.iterations || 1;

    logger.info(`Starting analysis across ${chains.length} chains and ${providers.length} providers`);
    
    const spinner = ora('Running gas abstraction tests...').start();
    const allResults: TransactionResult[] = [];

    try {
      for (let iteration = 0; iteration < iterations; iteration++) {
        if (iterations > 1) {
          spinner.text = `Running iteration ${iteration + 1}/${iterations}...`;
        }

        for (const chain of chains) {
          const chainProviders = providers.filter(p => 
            p.supportedChains.includes(chain.id)
          );

          for (const providerConfig of chainProviders) {
            spinner.text = `Testing ${providerConfig.name} on ${chain.name}...`;
            
            const provider = createProvider(providerConfig, chain, process.env.NODE_ENV === 'test');
            if (!provider) {
              logger.warn(`Failed to create provider ${providerConfig.name}`);
              continue;
            }

            try {
              const result = await Promise.race([
                provider.testTransaction(this.config.testTransaction),
                new Promise<TransactionResult>((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
                ),
              ]);

              allResults.push(result);
              this.statsTracker.addResult(result);
            } catch (error) {
              const failureResult: TransactionResult = {
                provider: providerConfig.name,
                chain: chain.name,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
              };
              
              allResults.push(failureResult);
              this.statsTracker.addResult(failureResult);
            }
          }
        }
      }

      spinner.succeed(`Completed ${allResults.length} tests`);
      return allResults;
    } catch (error) {
      spinner.fail('Analysis failed');
      logger.error('Full analysis failed:', error);
      throw error;
    }
  }

  async testProvider(
    providerName: string, 
    chainName: string,
    transaction?: TestTransaction
  ): Promise<TransactionResult> {
    const chain = this.getChainByName(chainName);
    const providerConfig = this.getProviderByName(providerName);
    
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }
    
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    if (!providerConfig.supportedChains.includes(chain.id)) {
      throw new Error(`${providerName} does not support ${chainName}`);
    }

    const provider = createProvider(providerConfig, chain, process.env.NODE_ENV === 'test');
    if (!provider) {
      throw new Error(`Failed to create provider ${providerName}`);
    }

    const testTx = transaction || this.config.testTransaction;
    return await provider.testTransaction(testTx);
  }

  generateCostReport(): string {
    const results = this.statsTracker.exportResults();
    return this.costAnalyzer.generateCostReport(results);
  }

  generateStatsReport(): string {
    return this.statsTracker.generateReport();
  }

  getProviderStats() {
    return this.statsTracker.getProviderStats();
  }

  clearHistory(): void {
    this.statsTracker.clearResults();
  }

  private getSelectedChains(chainNames?: string[]): ChainConfig[] {
    if (!chainNames || chainNames.length === 0) {
      return this.config.chains;
    }

    return chainNames
      .map(name => this.getChainByName(name))
      .filter((chain): chain is ChainConfig => chain !== undefined);
  }

  private getSelectedProviders(providerNames?: string[]): ProviderConfig[] {
    if (!providerNames || providerNames.length === 0) {
      return this.config.providers;
    }

    return providerNames
      .map(name => this.getProviderByName(name))
      .filter((provider): provider is ProviderConfig => provider !== undefined);
  }

  private getChainByName(name: string): ChainConfig | undefined {
    return this.config.chains.find(
      chain => chain.name.toLowerCase() === name.toLowerCase()
    );
  }

  private getProviderByName(name: string): ProviderConfig | undefined {
    return this.config.providers.find(
      provider => provider.name.toLowerCase() === name.toLowerCase()
    );
  }
}