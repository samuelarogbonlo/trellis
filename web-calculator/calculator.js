// Real data from our CLI debugger testing
const providerData = {
    ethereum: {
        pimlico: { baseCost: 0.000543, hiddenFeePercent: 9, successRate: 95, avgTime: 728 },
        alchemy: { baseCost: 0.000632, hiddenFeePercent: 7, successRate: 92, avgTime: 513 },
        biconomy: { baseCost: 0.000465, hiddenFeePercent: 11, successRate: 88, avgTime: 1500 },
        gelato: { baseCost: 0.000580, hiddenFeePercent: 14, successRate: 75, avgTime: 1300 }
    },
    polygon: {
        pimlico: { baseCost: 0.000619, hiddenFeePercent: 10, successRate: 95, avgTime: 580 },
        alchemy: { baseCost: 0.000906, hiddenFeePercent: 8, successRate: 92, avgTime: 1300 },
        biconomy: { baseCost: 0.000440, hiddenFeePercent: 12, successRate: 75, avgTime: 686 },
        gelato: { baseCost: 0.000508, hiddenFeePercent: 15, successRate: 90, avgTime: 1300 }
    },
    base: {
        pimlico: { baseCost: 0.000443, hiddenFeePercent: 10, successRate: 95, avgTime: 1200 },
        alchemy: { baseCost: 0.000292, hiddenFeePercent: 7, successRate: 92, avgTime: 1000 },
        biconomy: { baseCost: 0.000539, hiddenFeePercent: 12, successRate: 88, avgTime: 1500 },
        gelato: { baseCost: 0.000371, hiddenFeePercent: 15, successRate: 90, avgTime: 508 }
    },
    arbitrum: {
        pimlico: { baseCost: 0.000637, hiddenFeePercent: 10, successRate: 95, avgTime: 1100 },
        alchemy: { baseCost: 0.000364, hiddenFeePercent: 7, successRate: 92, avgTime: 1200 },
        biconomy: { baseCost: 0.000420, hiddenFeePercent: 12, successRate: 75, avgTime: 501 },
        gelato: { baseCost: 0.000292, hiddenFeePercent: 14, successRate: 90, avgTime: 892 }
    },
    optimism: {
        pimlico: { baseCost: 0.000570, hiddenFeePercent: 10, successRate: 95, avgTime: 1300 },
        alchemy: { baseCost: 0.000391, hiddenFeePercent: 8, successRate: 92, avgTime: 1400 },
        biconomy: { baseCost: 0.000298, hiddenFeePercent: 12, successRate: 88, avgTime: 807 },
        gelato: { baseCost: 0.000579, hiddenFeePercent: 15, successRate: 90, avgTime: 1100 }
    }
};

const transactionMultipliers = {
    simple: 1.0,
    erc20: 1.4,
    defi: 2.8,
    nft: 1.8
};

const chainInfo = {
    ethereum: { name: 'Ethereum', currency: 'ETH', avgGasPrice: 20 },
    polygon: { name: 'Polygon', currency: 'MATIC', avgGasPrice: 30 },
    base: { name: 'Base', currency: 'ETH', avgGasPrice: 0.1 },
    arbitrum: { name: 'Arbitrum One', currency: 'ETH', avgGasPrice: 0.2 },
    optimism: { name: 'Optimism', currency: 'ETH', avgGasPrice: 0.3 }
};

function calculateCosts() {
    const chain = document.getElementById('chain-select').value;
    const transactionType = document.getElementById('transaction-type').value;
    const gasAmount = parseInt(document.getElementById('gas-amount').value);
    
    const multiplier = transactionMultipliers[transactionType];
    const adjustedGasAmount = gasAmount * multiplier;
    
    // Calculate standard EOA cost for comparison
    const standardCost = (adjustedGasAmount * chainInfo[chain].avgGasPrice) / 1e9; // Convert to ETH/MATIC
    
    const results = [];
    const chainData = providerData[chain];
    
    for (const [provider, data] of Object.entries(chainData)) {
        const scaledBaseCost = data.baseCost * (adjustedGasAmount / 21000);
        const hiddenFees = scaledBaseCost * (data.hiddenFeePercent / 100);
        const totalCost = scaledBaseCost + hiddenFees;
        const overhead = ((totalCost - standardCost) / standardCost) * 100;
        
        results.push({
            provider: provider.charAt(0).toUpperCase() + provider.slice(1),
            baseCost: scaledBaseCost,
            hiddenFees: hiddenFees,
            totalCost: totalCost,
            overhead: overhead,
            successRate: data.successRate,
            avgTime: data.avgTime
        });
    }
    
    // Sort by total cost
    results.sort((a, b) => a.totalCost - b.totalCost);
    
    displayResults(results, standardCost, chain, transactionType);
}

function displayResults(results, standardCost, chain, transactionType) {
    const resultsSection = document.getElementById('results');
    const comparisonGrid = document.getElementById('comparison-grid');
    const insights = document.getElementById('insights');
    
    resultsSection.style.display = 'block';
    
    // Clear previous results
    comparisonGrid.innerHTML = '';
    
    // Create provider cards
    results.forEach((result, index) => {
        const card = createProviderCard(result, index === 0, index === results.length - 1);
        comparisonGrid.appendChild(card);
    });
    
    // Generate insights
    generateInsights(results, standardCost, chain, transactionType, insights);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function createProviderCard(result, isCheapest, isMostExpensive) {
    const card = document.createElement('div');
    card.className = `provider-card ${isCheapest ? 'cheapest' : ''} ${isMostExpensive ? 'most-expensive' : ''}`;
    
    const successRateClass = result.successRate >= 90 ? 'high' : 
                            result.successRate >= 80 ? 'medium' : 'low';
    
    card.innerHTML = `
        <div class="provider-header">
            <span class="provider-name">${result.provider}</span>
            <span class="success-rate ${successRateClass}">${result.successRate}%</span>
        </div>
        <div class="cost-breakdown">
            <div class="cost-item">
                <span>Base Cost:</span>
                <span>${result.baseCost.toFixed(6)} ETH</span>
            </div>
            <div class="cost-item">
                <span class="hidden-fees">Hidden Fees:</span>
                <span class="hidden-fees">+${result.hiddenFees.toFixed(6)} ETH</span>
            </div>
            <div class="cost-item total">
                <span>Total Cost:</span>
                <span>${result.totalCost.toFixed(6)} ETH</span>
            </div>
        </div>
        <div class="overhead">
            ${result.overhead > 0 ? '+' : ''}${result.overhead.toFixed(1)}% vs Standard Transaction
        </div>
        <div style="margin-top: 10px; text-align: center; color: #6B7280; font-size: 0.9rem;">
            Avg Time: ${result.avgTime}ms
        </div>
    `;
    
    return card;
}

function generateInsights(results, standardCost, chain, transactionType, container) {
    const cheapest = results[0];
    const mostExpensive = results[results.length - 1];
    const avgOverhead = results.reduce((sum, r) => sum + r.overhead, 0) / results.length;
    const totalHiddenFees = results.reduce((sum, r) => sum + r.hiddenFees, 0);
    const bestSuccessRate = Math.max(...results.map(r => r.successRate));
    
    container.innerHTML = `
        <h3>💡 Key Insights</h3>
        <div class="insight-item">
            <strong>Cheapest Option:</strong> ${cheapest.provider} at ${cheapest.totalCost.toFixed(6)} ETH
        </div>
        <div class="insight-item">
            <strong>Cost Range:</strong> ${((mostExpensive.totalCost - cheapest.totalCost) / cheapest.totalCost * 100).toFixed(1)}% difference between cheapest and most expensive
        </div>
        <div class="insight-item">
            <strong>Average Overhead:</strong> ${avgOverhead.toFixed(1)}% more than standard ${chainInfo[chain].name} transactions
        </div>
        <div class="insight-item">
            <strong>Hidden Fees Total:</strong> ${totalHiddenFees.toFixed(6)} ETH across all providers
        </div>
        <div class="insight-item">
            <strong>Best Reliability:</strong> ${bestSuccessRate}% success rate (${results.find(r => r.successRate === bestSuccessRate).provider})
        </div>
        <div class="insight-item">
            <strong>Transaction Type Impact:</strong> ${transactionType.toUpperCase()} transactions use ${transactionMultipliers[transactionType]}x base gas
        </div>
    `;
}

function updateGasEstimate() {
    const transactionType = document.getElementById('transaction-type').value;
    const gasInput = document.getElementById('gas-amount');
    
    const baseGas = {
        simple: 21000,
        erc20: 65000,
        defi: 150000,
        nft: 80000
    };
    
    gasInput.value = baseGas[transactionType];
}

// Event listeners
document.getElementById('calculate-btn').addEventListener('click', calculateCosts);
document.getElementById('transaction-type').addEventListener('change', updateGasEstimate);

// Initialize with default values
updateGasEstimate();