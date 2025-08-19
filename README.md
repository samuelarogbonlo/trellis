# Gas Abstraction Debugger

A professional CLI tool for testing and analyzing gas abstraction providers across multiple chains. Built to expose the reality behind gas abstraction - real costs, success rates, and hidden fees.

## Features

- **Multi-Provider Testing**: Test Pimlico, Alchemy, Biconomy, and Gelato
- **Cross-Chain Analysis**: Support for Ethereum, Polygon, Base, Arbitrum, and Optimism
- **Cost Transparency**: Reveals hidden fees and actual costs vs. advertised
- **Performance Metrics**: Success rates, execution times, and MEV exposure analysis
- **Professional Output**: Clean CLI interface with formatted tables and reports

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests across all providers and chains
npm run dev test

# Test a specific provider on a specific chain
npm run dev single -p pimlico -c base

# List supported providers and chains
npm run dev list

# Generate detailed reports
npm run dev report
```

## Commands

### `test` - Run comprehensive analysis
```bash
gas-debug test [options]

Options:
  -c, --chains <chains...>     Specific chains to test
  -p, --providers <providers...> Specific providers to test  
  -i, --iterations <number>    Number of test iterations (default: 1)
  --to <address>              Target address for test transaction
  --value <amount>            Value to send (default: "0")
  --data <hex>                Call data (default: "0x")
```

Examples:
```bash
# Test all providers on Base and Arbitrum
gas-debug test -c base arbitrum

# Test only Pimlico and Alchemy
gas-debug test -p pimlico alchemy

# Run 5 iterations for statistical significance
gas-debug test -i 5
```

### `single` - Test specific provider/chain combination
```bash
gas-debug single -p <provider> -c <chain> [options]

Required:
  -p, --provider <name>       Provider (pimlico, alchemy, biconomy, gelato)
  -c, --chain <name>          Chain (ethereum, polygon, base, arbitrum, optimism)

Options:
  --to <address>              Target address
  --value <amount>            Value to send
  --data <hex>                Call data
```

### `list` - Show supported providers and chains
```bash
gas-debug list
```

### `report` - Generate analysis reports
```bash
gas-debug report [options]

Options:
  -t, --type <type>           Report type (cost, stats, both) [default: both]
```

## Configuration

### Environment Variables
```bash
# API Keys (optional, will use public endpoints if not provided)
PIMLICO_API_KEY=your_pimlico_key
ALCHEMY_API_KEY=your_alchemy_key  
BICONOMY_API_KEY=your_biconomy_key
GELATO_API_KEY=your_gelato_key
```

### Supported Chains
- **Ethereum** (Chain ID: 1)
- **Polygon** (Chain ID: 137) 
- **Base** (Chain ID: 8453)
- **Arbitrum One** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)

### Supported Providers
- **Pimlico** - 10% fee overhead
- **Alchemy** - 8% fee overhead  
- **Biconomy** - 12% fee overhead
- **Gelato** - 15% fee overhead

## Output Examples

### Test Results Table
```
┌──────────┬──────────┬────────┬──────────┬──────────┬─────────────┬──────────┬──────────┐
│ Provider │ Chain    │ Status │ Gas Used │ Gas Cost │ Hidden Fees │ Time     │ MEV Risk │
├──────────┼──────────┼────────┼──────────┼──────────┼─────────────┼──────────┼──────────┤
│ Pimlico  │ Base     │ ✓      │ 21,000   │ 0.000420 │ 0.000042    │ 1.2s     │ LOW      │
│ Alchemy  │ Base     │ ✓      │ 21,000   │ 0.000420 │ 0.000034    │ 0.8s     │ LOW      │
│ Biconomy │ Base     │ ✗      │ N/A      │ N/A      │ N/A         │ 5.0s     │ N/A      │
│ Gelato   │ Base     │ ✓      │ 21,000   │ 0.000420 │ 0.000063    │ 2.1s     │ MEDIUM   │
└──────────┴──────────┴────────┴──────────┴──────────┴─────────────┴──────────┴──────────┘
```

### Cost Analysis Report
```
📊 Gas Abstraction Cost Analysis Report
==================================================

💰 Cost Overhead by Chain:
  Base:
    Average Overhead: 156.7%
    Cheapest: Alchemy
    Most Expensive: Gelato

  Arbitrum:
    Average Overhead: 203.4%
    Cheapest: Pimlico
    Most Expensive: Biconomy

🕵️ Hidden Fees Detected:
  Pimlico on Base: +10.0%
  Gelato on Arbitrum: +15.0%
  Biconomy on Polygon: +12.0%

📈 Overall Average Overhead: 178.9%
```

## Development

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

```
src/
├── cli.ts                 # Main CLI interface
├── core/
│   └── debugger.ts       # Main debugger orchestrator
├── providers/            # Provider implementations
│   ├── base.ts          # Abstract base provider
│   ├── pimlico.ts       # Pimlico implementation
│   ├── alchemy.ts       # Alchemy implementation
│   ├── biconomy.ts      # Biconomy implementation
│   └── gelato.ts        # Gelato implementation
├── analyzer/             # Analysis engines
│   ├── cost-analyzer.ts # Cost and fee analysis
│   └── stats-tracker.ts # Success rate tracking
├── config/              # Configuration
│   ├── chains.ts        # Chain configurations
│   └── providers.ts     # Provider configurations
├── utils/               # Utilities
│   ├── logger.ts        # Logging utility
│   └── formatter.ts     # Output formatting
└── types/               # TypeScript definitions
    └── index.ts         # Type definitions
```

## Contributing

This is an open source project focused on transparency in gas abstraction. Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
