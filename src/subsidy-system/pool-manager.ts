import { ethers } from 'ethers';
import { SubsidyPaymaster } from '../types/contracts';

export interface PoolMetrics {
    totalPoolSize: bigint;
    remainingFunds: bigint;
    totalSubsidiesUsed: bigint;
    utilizationRate: number;
    averageSubsidyPerTransaction: bigint;
    estimatedTransactionsRemaining: number;
}

export interface ExperimentConfig {
    experimentDuration: number; // seconds
    maxTransactionsPerUser: number;
    maxSubsidyPerUser: bigint;
    subsidyLevels: {
        none: 0;
        partial: 50; // 50% subsidy
        full: 100; // 100% subsidy
    };
}

export class SubsidyPoolManager {
    private contract: SubsidyPaymaster;
    private provider: ethers.Provider;
    private signer: ethers.Signer;

    constructor(
        contractAddress: string,
        provider: ethers.Provider,
        signer: ethers.Signer
    ) {
        this.provider = provider;
        this.signer = signer;
        // Contract ABI would be imported from compiled artifacts
        this.contract = new ethers.Contract(
            contractAddress,
            [], // SubsidyPaymaster ABI would go here
            signer
        ) as SubsidyPaymaster;
    }

    /**
     * Fund the subsidy pool for experiments
     */
    async fundPool(amount: bigint): Promise<ethers.TransactionResponse> {
        console.log(`💰 Funding subsidy pool with ${ethers.formatEther(amount)} ETH`);
        
        return await this.contract.fundSubsidyPool({ value: amount });
    }

    /**
     * Get current pool metrics
     */
    async getPoolMetrics(): Promise<PoolMetrics> {
        const [totalPool, totalUsed] = await Promise.all([
            this.contract.totalSubsidyPool(),
            this.contract.totalSubsidiesUsed()
        ]);

        const remainingFunds = totalPool - totalUsed;
        const utilizationRate = totalPool > 0n ? Number(totalUsed * 100n / totalPool) : 0;
        
        // Get transaction history to calculate averages
        const transactionHistory = await this.contract.getTransactionHistory(0, 100);
        const totalTransactions = transactionHistory.length;
        
        const averageSubsidyPerTransaction = totalTransactions > 0 
            ? totalUsed / BigInt(totalTransactions)
            : 0n;
            
        const estimatedTransactionsRemaining = averageSubsidyPerTransaction > 0n
            ? Number(remainingFunds / averageSubsidyPerTransaction)
            : 0;

        return {
            totalPoolSize: totalPool,
            remainingFunds,
            totalSubsidiesUsed: totalUsed,
            utilizationRate,
            averageSubsidyPerTransaction,
            estimatedTransactionsRemaining
        };
    }

    /**
     * Enroll user in experiment with specific subsidy level
     */
    async enrollUser(
        userAddress: string, 
        subsidyLevel: 'none' | 'partial' | 'full'
    ): Promise<ethers.TransactionResponse> {
        const levelMap = { none: 0, partial: 1, full: 2 };
        
        console.log(`👤 Enrolling user ${userAddress} in ${subsidyLevel} subsidy experiment`);
        
        return await this.contract.assignUserToLevel(
            userAddress, 
            levelMap[subsidyLevel]
        );
    }

    /**
     * Bulk enroll users with random assignment for A/B testing
     */
    async bulkEnrollUsers(userAddresses: string[]): Promise<ethers.TransactionResponse[]> {
        const results: ethers.TransactionResponse[] = [];
        
        console.log(`📊 Bulk enrolling ${userAddresses.length} users with random assignment`);
        
        for (const userAddress of userAddresses) {
            // Generate random seed for assignment
            const randomSeed = Math.floor(Math.random() * 1000000);
            
            const tx = await this.contract.enrollUser(userAddress, randomSeed);
            results.push(tx);
            
            // Add delay to prevent nonce conflicts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return results;
    }

    /**
     * Get user's current experiment status
     */
    async getUserExperiment(userAddress: string) {
        const experiment = await this.contract.getUserExperiment(userAddress);
        
        return {
            subsidyLevel: ['none', 'partial', 'full'][experiment.subsidyLevel],
            transactionCount: Number(experiment.transactionCount),
            lastTransactionTime: new Date(Number(experiment.lastTransactionTime) * 1000),
            isActive: experiment.isActive,
            timeRemaining: this.calculateTimeRemaining(experiment.lastTransactionTime)
        };
    }

    /**
     * Get experiment statistics for analysis
     */
    async getExperimentStats() {
        const stats = await this.contract.getExperimentStats();
        
        return {
            totalUsers: Number(stats.totalUsers),
            activeUsers: Number(stats.activeUsers),
            totalTransactions: Number(stats.totalTransactions),
            usersByLevel: {
                none: Number(stats.usersByLevel[0]),
                partial: Number(stats.usersByLevel[1]),
                full: Number(stats.usersByLevel[2])
            },
            totalSubsidized: stats.totalSubsidized
        };
    }

    /**
     * Get detailed transaction analytics
     */
    async getTransactionAnalytics(limit: number = 1000) {
        const transactions = await this.contract.getTransactionHistory(0, limit);
        
        // Process transactions for analytics
        const analytics = {
            totalTransactions: transactions.length,
            bySubsidyLevel: {
                none: { count: 0, totalGas: 0n, totalSubsidy: 0n },
                partial: { count: 0, totalGas: 0n, totalSubsidy: 0n },
                full: { count: 0, totalGas: 0n, totalSubsidy: 0n }
            },
            averageGasCost: 0n,
            totalSubsidySpent: 0n,
            transactionsByDay: new Map<string, number>()
        };

        let totalGas = 0n;
        
        for (const tx of transactions) {
            const level = ['none', 'partial', 'full'][tx.subsidyLevel] as keyof typeof analytics.bySubsidyLevel;
            
            analytics.bySubsidyLevel[level].count++;
            analytics.bySubsidyLevel[level].totalGas += tx.gasCost;
            analytics.bySubsidyLevel[level].totalSubsidy += tx.subsidyAmount;
            
            totalGas += tx.gasCost;
            analytics.totalSubsidySpent += tx.subsidyAmount;
            
            // Group by day for time series analysis
            const day = new Date(Number(tx.timestamp) * 1000).toISOString().split('T')[0];
            analytics.transactionsByDay.set(
                day, 
                (analytics.transactionsByDay.get(day) || 0) + 1
            );
        }
        
        analytics.averageGasCost = transactions.length > 0 
            ? totalGas / BigInt(transactions.length) 
            : 0n;
            
        return analytics;
    }

    /**
     * Monitor pool health and send alerts
     */
    async monitorPoolHealth(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        alerts: string[];
        recommendations: string[];
    }> {
        const metrics = await this.getPoolMetrics();
        const alerts: string[] = [];
        const recommendations: string[] = [];
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        // Check utilization rate
        if (metrics.utilizationRate > 90) {
            status = 'critical';
            alerts.push('Pool utilization above 90% - immediate funding needed');
            recommendations.push('Fund pool with additional ETH immediately');
        } else if (metrics.utilizationRate > 75) {
            status = 'warning';
            alerts.push('Pool utilization above 75% - consider funding soon');
            recommendations.push('Plan to fund pool within 24 hours');
        }
        
        // Check estimated transactions remaining
        if (metrics.estimatedTransactionsRemaining < 50) {
            status = status === 'critical' ? 'critical' : 'warning';
            alerts.push(`Only ${metrics.estimatedTransactionsRemaining} transactions estimated remaining`);
            recommendations.push('Increase pool funding to maintain experiment');
        }
        
        // Check if average subsidy is too high
        const avgSubsidyEth = Number(ethers.formatEther(metrics.averageSubsidyPerTransaction));
        if (avgSubsidyEth > 0.01) { // $20-30 at current prices
            alerts.push('Average subsidy cost is high - review gas optimization');
            recommendations.push('Consider optimizing target applications for lower gas usage');
        }
        
        return { status, alerts, recommendations };
    }

    /**
     * Emergency functions
     */
    async pauseExperiment(): Promise<ethers.TransactionResponse> {
        console.log('⚠️ Pausing experiment - emergency stop');
        // This would require adding a pause function to the contract
        throw new Error('Pause function not implemented in contract');
    }

    async withdrawEmergencyFunds(): Promise<ethers.TransactionResponse> {
        console.log('🚨 Emergency withdrawal of remaining funds');
        return await this.contract.withdrawFunds();
    }

    /**
     * Update experiment parameters
     */
    async updateExperimentConfig(config: Partial<ExperimentConfig>): Promise<ethers.TransactionResponse> {
        console.log('⚙️ Updating experiment configuration');
        
        return await this.contract.updateExperimentParams(
            config.experimentDuration || 30 * 24 * 60 * 60, // 30 days
            config.maxTransactionsPerUser || 100,
            config.maxSubsidyPerUser || ethers.parseEther('0.1')
        );
    }

    /**
     * Helper methods
     */
    private calculateTimeRemaining(lastTransactionTime: bigint): number {
        const experimentDuration = 30 * 24 * 60 * 60; // 30 days in seconds
        const lastTxTime = Number(lastTransactionTime);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeElapsed = currentTime - lastTxTime;
        
        return Math.max(0, experimentDuration - timeElapsed);
    }

    /**
     * Generate funding recommendation based on usage patterns
     */
    async generateFundingRecommendation(): Promise<{
        recommendedAmount: bigint;
        rationale: string;
        urgency: 'low' | 'medium' | 'high';
    }> {
        const [metrics, analytics] = await Promise.all([
            this.getPoolMetrics(),
            this.getTransactionAnalytics()
        ]);
        
        // Calculate daily burn rate
        const dailyTransactions = Array.from(analytics.transactionsByDay.values())
            .reduce((sum, count) => sum + count, 0) / analytics.transactionsByDay.size;
        
        const dailyBurnRate = metrics.averageSubsidyPerTransaction * BigInt(Math.floor(dailyTransactions));
        
        // Recommend funding for 7 days of operations
        const recommendedAmount = dailyBurnRate * 7n;
        
        let urgency: 'low' | 'medium' | 'high' = 'low';
        if (metrics.utilizationRate > 75) urgency = 'high';
        else if (metrics.utilizationRate > 50) urgency = 'medium';
        
        const rationale = `Based on ${dailyTransactions.toFixed(1)} daily transactions averaging ${ethers.formatEther(metrics.averageSubsidyPerTransaction)} ETH subsidy, recommending 7-day funding buffer.`;
        
        return { recommendedAmount, rationale, urgency };
    }
}