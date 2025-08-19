#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GasAbstractionDebugger } from './core/debugger.js';
import { formatResultsTable, formatStatsTable } from './utils/formatter.js';
import { logger, LogLevel } from './utils/logger.js';
import { SUPPORTED_CHAINS } from './config/chains.js';
import { DEFAULT_PROVIDERS } from './config/providers.js';

const program = new Command();

program
  .name('gas-debug')
  .description('CLI tool for testing and debugging gas abstraction providers')
  .version('0.1.0');

program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('--mock', 'Use mock providers for testing (no real API calls)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      logger.setLevel(LogLevel.DEBUG);
    } else if (opts.quiet) {
      logger.setLevel(LogLevel.ERROR);
    }
    if (opts.mock) {
      process.env.NODE_ENV = 'test';
    }
  });

program
  .command('test')
  .description('Run gas abstraction tests across providers and chains')
  .option('-c, --chains <chains...>', 'Specific chains to test (space-separated)')
  .option('-p, --providers <providers...>', 'Specific providers to test (space-separated)')
  .option('-i, --iterations <number>', 'Number of test iterations', '1')
  .option('--to <address>', 'Target address for test transaction')
  .option('--value <amount>', 'Value to send in test transaction', '0')
  .option('--data <hex>', 'Call data for test transaction', '0x')
  .action(async (options) => {
    try {
      const gasDebugger = new GasAbstractionDebugger();
      
      const testConfig = {
        chains: options.chains,
        providers: options.providers,
        iterations: parseInt(options.iterations),
      };

      if (options.to || options.value || options.data) {
        gasDebugger['config'].testTransaction = {
          to: options.to || gasDebugger['config'].testTransaction.to,
          value: options.value || gasDebugger['config'].testTransaction.value,
          data: options.data || gasDebugger['config'].testTransaction.data,
        };
      }

      const results = await gasDebugger.runFullAnalysis(testConfig);
      
      console.log('\n' + chalk.bold('🔍 Gas Abstraction Test Results'));
      console.log('=' .repeat(80));
      console.log(formatResultsTable(results));
      
      console.log('\n' + chalk.bold('📊 Provider Statistics'));
      console.log('=' .repeat(50));
      const stats = gasDebugger.getProviderStats();
      console.log(formatStatsTable(stats));

      console.log('\n' + chalk.bold('💰 Cost Analysis'));
      console.log('=' .repeat(40));
      console.log(gasDebugger.generateCostReport());

      const successfulTests = results.filter(r => r.success).length;
      const successRate = (successfulTests / results.length) * 100;
      
      console.log(chalk.bold(`\n📈 Overall Success Rate: ${successRate.toFixed(1)}%`));
      
    } catch (error) {
      logger.error('Test command failed:', error);
      process.exit(1);
    }
  });

program
  .command('single')
  .description('Test a specific provider on a specific chain')
  .requiredOption('-p, --provider <name>', 'Provider name (pimlico, alchemy, biconomy, gelato)')
  .requiredOption('-c, --chain <name>', 'Chain name (ethereum, polygon, base, arbitrum, optimism)')
  .option('--to <address>', 'Target address for test transaction')
  .option('--value <amount>', 'Value to send in test transaction', '0')
  .option('--data <hex>', 'Call data for test transaction', '0x')
  .action(async (options) => {
    try {
      const gasDebugger = new GasAbstractionDebugger();
      
      const transaction = {
        to: options.to || '0x0000000000000000000000000000000000000000',
        value: options.value,
        data: options.data,
      };

      logger.info(`Testing ${options.provider} on ${options.chain}...`);
      
      const result = await gasDebugger.testProvider(
        options.provider,
        options.chain,
        transaction
      );

      console.log('\n' + chalk.bold('🔍 Single Provider Test Result'));
      console.log('=' .repeat(50));
      console.log(formatResultsTable([result]));

      if (result.success) {
        console.log(chalk.green('\n✅ Test completed successfully'));
      } else {
        console.log(chalk.red('\n❌ Test failed'));
        console.log(chalk.red(`Error: ${result.errorMessage}`));
      }
      
    } catch (error) {
      logger.error('Single test failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List supported chains and providers')
  .action(() => {
    console.log(chalk.bold('\n🌐 Supported Chains:'));
    SUPPORTED_CHAINS.forEach((chain) => {
      console.log(`  • ${chain.name} (Chain ID: ${chain.id})`);
    });

    console.log(chalk.bold('\n🏢 Supported Providers:'));
    DEFAULT_PROVIDERS.forEach((provider) => {
      console.log(`  • ${provider.name}`);
      console.log(`    Supported chains: ${provider.supportedChains.join(', ')}`);
    });
  });

program
  .command('report')
  .description('Generate detailed analysis report')
  .option('-t, --type <type>', 'Report type (cost, stats, both)', 'both')
  .action(async (options) => {
    try {
      const gasDebugger = new GasAbstractionDebugger();
      
      // Run a quick analysis first if no data exists
      const stats = gasDebugger.getProviderStats();
      if (stats.length === 0) {
        logger.info('No existing data found. Running quick analysis...');
        await gasDebugger.runFullAnalysis({ iterations: 1 });
      }

      console.log('\n' + chalk.bold('📋 Gas Abstraction Analysis Report'));
      console.log('=' .repeat(60));

      if (options.type === 'cost' || options.type === 'both') {
        console.log(gasDebugger.generateCostReport());
      }

      if (options.type === 'stats' || options.type === 'both') {
        console.log(gasDebugger.generateStatsReport());
      }
      
    } catch (error) {
      logger.error('Report generation failed:', error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  logger.error(`Unknown command '${operands[0]}'`);
  logger.info('Use --help to see available commands');
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}