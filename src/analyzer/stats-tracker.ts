import { TransactionResult, ProviderStats } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class StatsTracker {
  private results: TransactionResult[] = [];

  addResult(result: TransactionResult): void {
    this.results.push(result);
  }

  addResults(results: TransactionResult[]): void {
    this.results.push(...results);
  }

  getProviderStats(): ProviderStats[] {
    const groups = this.groupByProviderAndChain();
    
    return Object.entries(groups).map(([key, results]) => {
      const [provider, chain] = key.split('|');
      return this.calculateStats(provider, chain, results);
    });
  }

  private groupByProviderAndChain(): Record<string, TransactionResult[]> {
    return this.results.reduce((groups, result) => {
      const key = `${result.provider}|${result.chain}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(result);
      return groups;
    }, {} as Record<string, TransactionResult[]>);
  }

  private calculateStats(provider: string, chain: string, results: TransactionResult[]): ProviderStats {
    const successful = results.filter((r) => r.success);
    const successRate = successful.length / results.length;

    const costsWithData = successful.filter((r) => r.gasCost);
    const averageGasCost = costsWithData.length > 0
      ? costsWithData.reduce((sum, r) => sum + r.gasCost!, 0n) / BigInt(costsWithData.length)
      : 0n;

    const timesWithData = results.filter((r) => r.executionTime);
    const averageExecutionTime = timesWithData.length > 0
      ? timesWithData.reduce((sum, r) => sum + r.executionTime!, 0) / timesWithData.length
      : 0;

    return {
      provider,
      chain,
      successRate,
      averageGasCost,
      averageExecutionTime,
      totalTests: results.length,
      lastUpdated: Date.now(),
    };
  }

  getSuccessRateByChain(): Record<string, number> {
    const chainGroups = this.results.reduce((groups, result) => {
      if (!groups[result.chain]) {
        groups[result.chain] = [];
      }
      groups[result.chain].push(result);
      return groups;
    }, {} as Record<string, TransactionResult[]>);

    return Object.entries(chainGroups).reduce((rates, [chain, results]) => {
      const successful = results.filter((r) => r.success).length;
      rates[chain] = successful / results.length;
      return rates;
    }, {} as Record<string, number>);
  }

  getSuccessRateByProvider(): Record<string, number> {
    const providerGroups = this.results.reduce((groups, result) => {
      if (!groups[result.provider]) {
        groups[result.provider] = [];
      }
      groups[result.provider].push(result);
      return groups;
    }, {} as Record<string, TransactionResult[]>);

    return Object.entries(providerGroups).reduce((rates, [provider, results]) => {
      const successful = results.filter((r) => r.success).length;
      rates[provider] = successful / results.length;
      return rates;
    }, {} as Record<string, number>);
  }

  getFailurePatterns(): {
    errorMessage: string;
    count: number;
    providers: string[];
    chains: string[];
  }[] {
    const failures = this.results.filter((r) => !r.success && r.errorMessage);
    const errorGroups = failures.reduce((groups, failure) => {
      const error = failure.errorMessage!;
      if (!groups[error]) {
        groups[error] = {
          count: 0,
          providers: new Set<string>(),
          chains: new Set<string>(),
        };
      }
      groups[error].count++;
      groups[error].providers.add(failure.provider);
      groups[error].chains.add(failure.chain);
      return groups;
    }, {} as Record<string, { count: number; providers: Set<string>; chains: Set<string> }>);

    return Object.entries(errorGroups)
      .map(([errorMessage, data]) => ({
        errorMessage,
        count: data.count,
        providers: Array.from(data.providers),
        chains: Array.from(data.chains),
      }))
      .sort((a, b) => b.count - a.count);
  }

  generateReport(): string {
    const providerStats = this.getProviderStats();
    const chainSuccessRates = this.getSuccessRateByChain();
    const providerSuccessRates = this.getSuccessRateByProvider();
    const failurePatterns = this.getFailurePatterns();

    let report = '📈 Gas Abstraction Performance Report\n';
    report += '=' .repeat(50) + '\n\n';

    report += '🏆 Success Rates by Chain:\n';
    Object.entries(chainSuccessRates)
      .sort(([, a], [, b]) => b - a)
      .forEach(([chain, rate]) => {
        const emoji = rate >= 0.9 ? '🟢' : rate >= 0.7 ? '🟡' : '🔴';
        report += `  ${emoji} ${chain}: ${(rate * 100).toFixed(1)}%\n`;
      });

    report += '\n🏢 Success Rates by Provider:\n';
    Object.entries(providerSuccessRates)
      .sort(([, a], [, b]) => b - a)
      .forEach(([provider, rate]) => {
        const emoji = rate >= 0.9 ? '🟢' : rate >= 0.7 ? '🟡' : '🔴';
        report += `  ${emoji} ${provider}: ${(rate * 100).toFixed(1)}%\n`;
      });

    if (failurePatterns.length > 0) {
      report += '\n❌ Common Failure Patterns:\n';
      failurePatterns.slice(0, 5).forEach((pattern, index) => {
        report += `  ${index + 1}. "${pattern.errorMessage}" (${pattern.count} times)\n`;
        report += `     Providers: ${pattern.providers.join(', ')}\n`;
        report += `     Chains: ${pattern.chains.join(', ')}\n\n`;
      });
    }

    report += `📊 Total Tests: ${this.results.length}\n`;
    report += `✅ Successful: ${this.results.filter(r => r.success).length}\n`;
    report += `❌ Failed: ${this.results.filter(r => !r.success).length}\n`;

    return report;
  }

  clearResults(): void {
    this.results = [];
    logger.info('Stats tracker cleared');
  }

  exportResults(): TransactionResult[] {
    return [...this.results];
  }
}