import { BaseProvider } from './base.js';
import { TransactionResult, TestTransaction } from '../types/index.js';

export class MockProvider extends BaseProvider {
  async testTransaction(transaction: TestTransaction): Promise<TransactionResult> {
    const startTime = Date.now();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate success/failure based on provider name
    const successRate = this.getSuccessRate();
    const isSuccess = Math.random() < successRate;
    
    if (!isSuccess) {
      return {
        provider: this.config.name,
        chain: this.chain.name,
        success: false,
        errorMessage: this.getRandomError(),
        executionTime: Date.now() - startTime,
        timestamp: startTime,
      };
    }

    const gasUsed = 21000n + BigInt(Math.floor(Math.random() * 10000));
    const gasPrice = BigInt(Math.floor(Math.random() * 20000000000) + 10000000000); // 10-30 gwei
    const gasCost = gasUsed * gasPrice;
    
    const hiddenFeePercentage = this.getHiddenFeePercentage();
    const hiddenFees = gasCost * BigInt(hiddenFeePercentage) / 100n;
    
    return {
      provider: this.config.name,
      chain: this.chain.name,
      success: true,
      gasUsed,
      gasCost,
      actualCost: gasCost + hiddenFees,
      hiddenFees,
      executionTime: Date.now() - startTime,
      mevRisk: this.getRandomMevRisk(),
      timestamp: startTime,
    };
  }

  private getSuccessRate(): number {
    switch (this.config.name.toLowerCase()) {
      case 'pimlico': return 0.95;
      case 'alchemy': return 0.92;
      case 'biconomy': return 0.88;
      case 'gelato': return 0.90;
      default: return 0.85;
    }
  }

  private getHiddenFeePercentage(): number {
    switch (this.config.name.toLowerCase()) {
      case 'pimlico': return 10;
      case 'alchemy': return 8;
      case 'biconomy': return 12;
      case 'gelato': return 15;
      default: return 10;
    }
  }

  private getRandomError(): string {
    const errors = [
      'Insufficient funds for gas + value',
      'Gas limit too low for transaction',
      'Transaction execution failed (reverted)',
      'Network congestion - transaction timeout',
      'Invalid nonce - transaction already processed',
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  private getRandomMevRisk(): 'LOW' | 'MEDIUM' | 'HIGH' {
    const risks: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];
    const weights = [0.6, 0.3, 0.1]; // 60% low, 30% medium, 10% high
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return risks[i];
      }
    }
    
    return 'LOW';
  }
}