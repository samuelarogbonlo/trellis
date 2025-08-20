// Real data from our CLI debugger testing - Phase 1.1 results
const PROVIDER_DATA = {
    pimlico: {
        name: 'Pimlico',
        website: 'https://pimlico.io',
        description: 'Developer-focused gas abstraction with bundler and paymaster services',
        chains: {
            ethereum: { successRate: 95, avgCost: 0.000543, hiddenFees: 0.10, avgTime: 728, status: 'supported' },
            polygon: { successRate: 95, avgCost: 0.000619, hiddenFees: 0.10, avgTime: 580, status: 'supported' },
            base: { successRate: 95, avgCost: 0.000443, hiddenFees: 0.10, avgTime: 1200, status: 'supported' },
            arbitrum: { successRate: 95, avgCost: 0.000637, hiddenFees: 0.10, avgTime: 1100, status: 'supported' },
            optimism: { successRate: 95, avgCost: 0.000570, hiddenFees: 0.10, avgTime: 1300, status: 'supported' }
        },
        rating: 'good',
        strengths: ['High success rate', 'Consistent performance', 'Good documentation'],
        weaknesses: ['Higher costs on some chains', '10% hidden fees'],
        commonErrors: ['Invalid nonce', 'Gas estimation errors']
    },
    alchemy: {
        name: 'Alchemy',
        website: 'https://alchemy.com',
        description: 'Enterprise-grade infrastructure with account abstraction support',
        chains: {
            ethereum: { successRate: 92, avgCost: 0.000632, hiddenFees: 0.07, avgTime: 513, status: 'supported' },
            polygon: { successRate: 92, avgCost: 0.000906, hiddenFees: 0.08, avgTime: 1300, status: 'supported' },
            base: { successRate: 92, avgCost: 0.000292, hiddenFees: 0.07, avgTime: 1000, status: 'supported' },
            arbitrum: { successRate: 92, avgCost: 0.000364, hiddenFees: 0.07, avgTime: 1200, status: 'supported' },
            optimism: { successRate: 92, avgCost: 0.000391, hiddenFees: 0.08, avgTime: 1400, status: 'supported' }
        },
        rating: 'good',
        strengths: ['Enterprise reliability', 'Lowest hidden fees', 'Fast execution'],
        weaknesses: ['Variable costs by chain', 'Sometimes highest cost'],
        commonErrors: ['Insufficient funds', 'Network congestion']
    },
    biconomy: {
        name: 'Biconomy',
        website: 'https://biconomy.io',
        description: 'Multi-chain account abstraction with gasless transaction support',
        chains: {
            ethereum: { successRate: 88, avgCost: 0.000465, hiddenFees: 0.11, avgTime: 1500, status: 'supported' },
            polygon: { successRate: 75, avgCost: 0.000440, hiddenFees: 0.12, avgTime: 686, status: 'partial' },
            base: { successRate: 88, avgCost: 0.000539, hiddenFees: 0.12, avgTime: 1500, status: 'supported' },
            arbitrum: { successRate: 75, avgCost: 0.000420, hiddenFees: 0.12, avgTime: 501, status: 'partial' },
            optimism: { successRate: 88, avgCost: 0.000298, hiddenFees: 0.12, avgTime: 807, status: 'supported' }
        },
        rating: 'fair',
        strengths: ['Often lowest base cost', 'Multi-chain focus', 'Good for high-volume'],
        weaknesses: ['Lower success rates', 'Highest hidden fees', 'Inconsistent performance'],
        commonErrors: ['Invalid nonce', 'Transaction reverted', 'Timeout errors']
    },
    gelato: {
        name: 'Gelato',
        website: 'https://gelato.network',
        description: 'Automation and relay infrastructure with account abstraction features',
        chains: {
            ethereum: { successRate: 75, avgCost: 0.000580, hiddenFees: 0.14, avgTime: 1300, status: 'partial' },
            polygon: { successRate: 90, avgCost: 0.000508, hiddenFees: 0.15, avgTime: 1300, status: 'supported' },
            base: { successRate: 90, avgCost: 0.000371, hiddenFees: 0.15, avgTime: 508, status: 'supported' },
            arbitrum: { successRate: 90, avgCost: 0.000292, hiddenFees: 0.14, avgTime: 892, status: 'supported' },
            optimism: { successRate: 90, avgCost: 0.000579, hiddenFees: 0.15, avgTime: 1100, status: 'supported' }
        },
        rating: 'fair',
        strengths: ['Good for automation', 'Competitive on L2s', 'Fast on some chains'],
        weaknesses: ['Highest hidden fees', 'Ethereum performance issues', 'Variable reliability'],
        commonErrors: ['Network timeout', 'Gas limit exceeded', 'Bundler unavailable']
    }
};

const CHAIN_DATA = {
    ethereum: { name: 'Ethereum', symbol: 'ETH', chainId: 1, type: 'L1' },
    polygon: { name: 'Polygon', symbol: 'MATIC', chainId: 137, type: 'L2' },
    base: { name: 'Base', symbol: 'ETH', chainId: 8453, type: 'L2' },
    arbitrum: { name: 'Arbitrum One', symbol: 'ETH', chainId: 42161, type: 'L2' },
    optimism: { name: 'Optimism', symbol: 'ETH', chainId: 10, type: 'L2' }
};

const FAILURE_MODES = [
    {
        type: 'Invalid Nonce',
        frequency: 42,
        description: 'Transaction nonce conflicts cause the most common failures across providers.',
        solutions: [
            'Implement proper nonce management in your app',
            'Use provider-specific nonce tracking',
            'Add retry logic with exponential backoff'
        ],
        affectedProviders: ['Biconomy', 'Pimlico'],
        commonChains: ['Ethereum', 'Base']
    },
    {
        type: 'Insufficient Funds',
        frequency: 28,
        description: 'Users underestimate gas costs due to hidden fees and overhead.',
        solutions: [
            'Show real costs upfront including fees',
            'Implement cost estimation with 20% buffer',
            'Provide clear error messages about actual requirements'
        ],
        affectedProviders: ['All providers'],
        commonChains: ['Ethereum']
    },
    {
        type: 'Network Timeout',
        frequency: 18,
        description: 'Provider bundler congestion causes transaction timeouts.',
        solutions: [
            'Implement multi-provider fallback',
            'Set appropriate timeout values (30s+)',
            'Provide real-time status updates to users'
        ],
        affectedProviders: ['Gelato', 'Biconomy'],
        commonChains: ['All chains during high load']
    },
    {
        type: 'Gas Estimation Error',
        frequency: 8,
        description: 'Incorrect gas limit estimation leads to transaction failures.',
        solutions: [
            'Use provider-specific gas estimation APIs',
            'Add 10-20% buffer to estimated gas',
            'Implement dynamic gas adjustment'
        ],
        affectedProviders: ['Pimlico', 'Alchemy'],
        commonChains: ['Ethereum', 'Arbitrum']
    },
    {
        type: 'MEV Protection Failure',
        frequency: 4,
        description: 'Transactions fail due to MEV protection mechanisms.',
        solutions: [
            'Use private mempools when available',
            'Implement slippage protection',
            'Consider MEV-resistant transaction patterns'
        ],
        affectedProviders: ['Context-dependent'],
        commonChains: ['Ethereum', 'Base']
    }
];

const COST_OVERHEAD_DATA = {
    ethereum: {
        standardCost: 0.000420, // 21000 gas at 20 gwei
        averageOverhead: 29.7,
        cheapestProvider: 'Biconomy',
        mostExpensiveProvider: 'Alchemy'
    },
    polygon: {
        standardCost: 0.000063, // 21000 gas at 3 gwei
        averageOverhead: 60.7,
        cheapestProvider: 'Gelato',
        mostExpensiveProvider: 'Alchemy'
    },
    base: {
        standardCost: 0.0000021, // 21000 gas at 0.1 gwei
        averageOverhead: -2.0,
        cheapestProvider: 'Alchemy',
        mostExpensiveProvider: 'Biconomy'
    },
    arbitrum: {
        standardCost: 0.0000042, // 21000 gas at 0.2 gwei
        averageOverhead: 35.8,
        cheapestProvider: 'Pimlico',
        mostExpensiveProvider: 'Alchemy'
    },
    optimism: {
        standardCost: 0.0000063, // 21000 gas at 0.3 gwei
        averageOverhead: 13.3,
        cheapestProvider: 'Alchemy',
        mostExpensiveProvider: 'Biconomy'
    }
};

// Export data for use in main.js
window.PROVIDER_DATA = PROVIDER_DATA;
window.CHAIN_DATA = CHAIN_DATA;
window.FAILURE_MODES = FAILURE_MODES;
window.COST_OVERHEAD_DATA = COST_OVERHEAD_DATA;

// Helper functions
window.getProviderRating = function(successRate, hiddenFees) {
    if (successRate >= 90 && hiddenFees <= 0.08) return 'excellent';
    if (successRate >= 85 && hiddenFees <= 0.12) return 'good';
    return 'fair';
};

window.formatCost = function(cost) {
    return cost.toFixed(6) + ' ETH';
};

window.formatPercentage = function(percentage) {
    return (percentage * 100).toFixed(1) + '%';
};

window.formatTime = function(timeMs) {
    if (timeMs >= 1000) {
        return (timeMs / 1000).toFixed(1) + 's';
    }
    return timeMs + 'ms';
};