import { table } from 'table';
import chalk from 'chalk';
import { TransactionResult, ProviderStats } from '../types/index.js';

export function formatWei(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(6)} ETH`;
}

export function formatGas(gas: bigint): string {
  return gas.toLocaleString();
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatSuccessRate(rate: number): string {
  const color = rate >= 0.9 ? chalk.green : rate >= 0.7 ? chalk.yellow : chalk.red;
  return color(`${(rate * 100).toFixed(1)}%`);
}

export function formatMevRisk(risk: string): string {
  switch (risk) {
    case 'LOW':
      return chalk.green(risk);
    case 'MEDIUM':
      return chalk.yellow(risk);
    case 'HIGH':
      return chalk.red(risk);
    default:
      return chalk.gray('UNKNOWN');
  }
}

export function formatResultsTable(results: TransactionResult[]): string {
  const headers = [
    'Provider',
    'Chain',
    'Status',
    'Gas Used',
    'Gas Cost',
    'Hidden Fees',
    'Time',
    'MEV Risk',
  ];

  const rows = results.map((result) => [
    result.provider,
    result.chain,
    result.success ? chalk.green('✓') : chalk.red('✗'),
    result.gasUsed ? formatGas(result.gasUsed) : 'N/A',
    result.gasCost ? formatWei(result.gasCost) : 'N/A',
    result.hiddenFees ? formatWei(result.hiddenFees) : 'N/A',
    result.executionTime ? formatTime(result.executionTime) : 'N/A',
    result.mevRisk ? formatMevRisk(result.mevRisk) : 'N/A',
  ]);

  return table([headers, ...rows], {
    border: {
      topBody: '─',
      topJoin: '┬',
      topLeft: '┌',
      topRight: '┐',
      bottomBody: '─',
      bottomJoin: '┴',
      bottomLeft: '└',
      bottomRight: '┘',
      bodyLeft: '│',
      bodyRight: '│',
      bodyJoin: '│',
      joinBody: '─',
      joinLeft: '├',
      joinRight: '┤',
      joinJoin: '┼',
    },
  });
}

export function formatStatsTable(stats: ProviderStats[]): string {
  const headers = ['Provider', 'Chain', 'Success Rate', 'Avg Gas Cost', 'Avg Time', 'Tests'];

  const rows = stats.map((stat) => [
    stat.provider,
    stat.chain,
    formatSuccessRate(stat.successRate),
    formatWei(stat.averageGasCost),
    formatTime(stat.averageExecutionTime),
    stat.totalTests.toString(),
  ]);

  return table([headers, ...rows], {
    border: {
      topBody: '─',
      topJoin: '┬',
      topLeft: '┌',
      topRight: '┐',
      bottomBody: '─',
      bottomJoin: '┴',
      bottomLeft: '└',
      bottomRight: '┘',
      bodyLeft: '│',
      bodyRight: '│',
      bodyJoin: '│',
      joinBody: '─',
      joinLeft: '├',
      joinRight: '┤',
      joinJoin: '┼',
    },
  });
}