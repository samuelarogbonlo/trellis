import { TransactionResult, ProviderStats } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface CostComparison {
  provider: string;
  chain: string;
  standardGasCost: bigint;
  abstractedGasCost: bigint;
  overhead: bigint;
  overheadPercentage: number;
  hiddenFees: bigint;
  totalCost: bigint;
  costEfficiencyRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface ChainCostSummary {
  chain: string;
  cheapestProvider: string;
  mostExpensiveProvider: string;
  averageOverhead: number;
  medianOverhead: number;
  totalHiddenFees: bigint;
}

export class CostAnalyzer {
  private baseGasCost: bigint = 21000n; // Standard ETH transfer

  analyzeTransactionCosts(results: TransactionResult[]): CostComparison[] {
    return results
      .filter((result) => result.success && result.gasCost && result.actualCost)
      .map((result) => this.createCostComparison(result));
  }

  private createCostComparison(result: TransactionResult): CostComparison {
    const standardGasCost = this.baseGasCost * BigInt('20000000000'); // 20 gwei
    const abstractedGasCost = result.gasCost!;
    const overhead = abstractedGasCost - standardGasCost;
    const overheadPercentage = Number((overhead * 100n) / standardGasCost);
    const hiddenFees = result.hiddenFees || 0n;
    const totalCost = result.actualCost!;

    return {
      provider: result.provider,
      chain: result.chain,
      standardGasCost,
      abstractedGasCost,
      overhead,
      overheadPercentage,
      hiddenFees,
      totalCost,
      costEfficiencyRating: this.calculateEfficiencyRating(overheadPercentage),
    };
  }

  private calculateEfficiencyRating(
    overheadPercentage: number
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (overheadPercentage <= 50) return 'EXCELLENT';
    if (overheadPercentage <= 100) return 'GOOD';
    if (overheadPercentage <= 200) return 'FAIR';
    return 'POOR';
  }

  summarizeCostsByChain(comparisons: CostComparison[]): ChainCostSummary[] {
    const chainGroups = this.groupByChain(comparisons);
    
    return Object.entries(chainGroups).map(([chain, comparisons]) => {
      const overheads = comparisons.map((c) => c.overheadPercentage);
      const totalHiddenFees = comparisons.reduce((sum, c) => sum + c.hiddenFees, 0n);
      
      const cheapest = comparisons.reduce((min, current) =>
        current.totalCost < min.totalCost ? current : min
      );
      
      const mostExpensive = comparisons.reduce((max, current) =>
        current.totalCost > max.totalCost ? current : max
      );

      return {
        chain,
        cheapestProvider: cheapest.provider,
        mostExpensiveProvider: mostExpensive.provider,
        averageOverhead: overheads.reduce((sum, o) => sum + o, 0) / overheads.length,
        medianOverhead: this.calculateMedian(overheads),
        totalHiddenFees,
      };
    });
  }

  private groupByChain(comparisons: CostComparison[]): Record<string, CostComparison[]> {
    return comparisons.reduce((groups, comparison) => {
      const chain = comparison.chain;
      if (!groups[chain]) {
        groups[chain] = [];
      }
      groups[chain].push(comparison);
      return groups;
    }, {} as Record<string, CostComparison[]>);
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  detectHiddenFees(results: TransactionResult[]): {
    provider: string;
    chain: string;
    declaredCost: bigint;
    actualCost: bigint;
    hiddenAmount: bigint;
    hiddenPercentage: number;
  }[] {
    return results
      .filter((r) => r.success && r.gasCost && r.actualCost && r.actualCost > r.gasCost)
      .map((result) => {
        const hiddenAmount = result.actualCost! - result.gasCost!;
        const hiddenPercentage = Number((hiddenAmount * 100n) / result.gasCost!);
        
        return {
          provider: result.provider,
          chain: result.chain,
          declaredCost: result.gasCost!,
          actualCost: result.actualCost!,
          hiddenAmount,
          hiddenPercentage,
        };
      });
  }

  generateCostReport(results: TransactionResult[]): string {
    const comparisons = this.analyzeTransactionCosts(results);
    const summaries = this.summarizeCostsByChain(comparisons);
    const hiddenFees = this.detectHiddenFees(results);

    let report = '📊 Gas Abstraction Cost Analysis Report\n';
    report += '=' .repeat(50) + '\n\n';

    report += '💰 Cost Overhead by Chain:\n';
    summaries.forEach((summary) => {
      report += `  ${summary.chain}:\n`;
      report += `    Average Overhead: ${summary.averageOverhead.toFixed(1)}%\n`;
      report += `    Cheapest: ${summary.cheapestProvider}\n`;
      report += `    Most Expensive: ${summary.mostExpensiveProvider}\n\n`;
    });

    if (hiddenFees.length > 0) {
      report += '🕵️ Hidden Fees Detected:\n';
      hiddenFees.forEach((fee) => {
        report += `  ${fee.provider} on ${fee.chain}: +${fee.hiddenPercentage.toFixed(1)}%\n`;
      });
      report += '\n';
    }

    const totalOverhead = comparisons.reduce((sum, c) => sum + c.overheadPercentage, 0) / comparisons.length;
    report += `📈 Overall Average Overhead: ${totalOverhead.toFixed(1)}%\n`;
    
    return report;
  }
}