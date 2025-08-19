import { ethers } from 'ethers';
import { TransactionResult, ProviderConfig, ChainConfig, TestTransaction } from '../types/index.js';
import { logger } from '../utils/logger.js';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected provider: ethers.JsonRpcProvider;
  protected chain: ChainConfig;

  constructor(config: ProviderConfig, chain: ChainConfig) {
    this.config = config;
    this.chain = chain;
    this.provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  }

  abstract testTransaction(transaction: TestTransaction): Promise<TransactionResult>;

  protected async measureExecutionTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
    const start = Date.now();
    const result = await fn();
    const executionTime = Date.now() - start;
    return [result, executionTime];
  }

  protected calculateMevRisk(gasPrice: bigint, baseFee?: bigint): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!baseFee) return 'MEDIUM';
    
    const premium = gasPrice - baseFee;
    const premiumPercentage = Number(premium * 100n) / Number(baseFee);
    
    if (premiumPercentage < 10) return 'LOW';
    if (premiumPercentage < 50) return 'MEDIUM';
    return 'HIGH';
  }

  protected parseError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;
      
      if (message.includes('insufficient funds')) {
        return 'Insufficient funds for gas + value';
      }
      if (message.includes('gas too low')) {
        return 'Gas limit too low for transaction';
      }
      if (message.includes('nonce too low')) {
        return 'Transaction nonce already used';
      }
      if (message.includes('replacement transaction underpriced')) {
        return 'Gas price too low to replace pending transaction';
      }
      if (message.includes('execution reverted')) {
        return 'Transaction execution failed (reverted)';
      }
      if (message.includes('timeout')) {
        return 'Transaction timeout - network congestion';
      }
      
      return message;
    }
    
    return 'Unknown error occurred';
  }

  protected async getLatestBlock(): Promise<ethers.Block | null> {
    try {
      return await this.provider.getBlock('latest');
    } catch (error) {
      logger.warn(`Failed to get latest block for ${this.chain.name}:`, error);
      return null;
    }
  }

  protected formatUrl(url: string, apiKey?: string): string {
    return url
      .replace('{chainId}', this.chain.id.toString())
      .replace('{apiKey}', apiKey || 'your-api-key');
  }
}