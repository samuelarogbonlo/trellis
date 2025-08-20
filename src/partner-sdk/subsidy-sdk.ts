import { ethers } from 'ethers';
import { SubsidyPoolManager } from '../subsidy-system/pool-manager';

export interface SDKConfig {
    paymasterAddress: string;
    bundlerUrl: string;
    chainId: number;
    apiKey?: string;
    provider?: ethers.Provider;
}

export interface TransactionRequest {
    to: string;
    value?: string;
    data?: string;
    gasLimit?: string;
    userAddress: string;
}

export interface SubsidyResult {
    success: boolean;
    txHash?: string;
    subsidyAmount?: bigint;
    actualGasCost?: bigint;
    error?: string;
    userExperimentStatus?: {
        subsidyLevel: 'none' | 'partial' | 'full';
        transactionCount: number;
        isActive: boolean;
    };
}

export interface RetentionMetrics {
    userId: string;
    firstTransactionTime: number;
    transactionCount: number;
    lastActiveTime: number;
    retentionPeriod: number; // days
    isRetained: boolean;
    subsidyLevel: 'none' | 'partial' | 'full';
}

/**
 * Partner App Integration SDK for Subsidy Experiments
 * 
 * This SDK allows partner applications to easily integrate with the
 * subsidy paymaster system for Phase 2.1 cost offset experiments.
 */
export class SubsidyIntegrationSDK {
    private config: SDKConfig;
    private poolManager: SubsidyPoolManager;
    private provider: ethers.Provider;
    private bundlerProvider: ethers.JsonRpcProvider;

    constructor(config: SDKConfig) {
        this.config = config;
        
        // Set up providers
        this.provider = config.provider || new ethers.JsonRpcProvider(this.getBundlerUrl());
        this.bundlerProvider = new ethers.JsonRpcProvider(config.bundlerUrl);
        
        // Initialize pool manager for monitoring
        this.poolManager = new SubsidyPoolManager(
            config.paymasterAddress,
            this.provider,
            ethers.Wallet.createRandom() // This would be the app's signer in real implementation
        );
    }

    /**
     * Enroll a user in the subsidy experiment
     * This should be called when a user first interacts with your app
     */
    async enrollUser(userAddress: string, forceLevel?: 'none' | 'partial' | 'full'): Promise<{
        enrolled: boolean;
        subsidyLevel: 'none' | 'partial' | 'full';
        error?: string;
    }> {
        try {
            console.log(`🎯 Enrolling user ${userAddress} in subsidy experiment`);
            
            // Check if user is already enrolled
            const existingExperiment = await this.poolManager.getUserExperiment(userAddress);
            if (existingExperiment.isActive) {
                return {
                    enrolled: true,
                    subsidyLevel: existingExperiment.subsidyLevel as 'none' | 'partial' | 'full'
                };
            }

            // Enroll user with specified level or random assignment
            if (forceLevel) {
                await this.poolManager.enrollUser(userAddress, forceLevel);
                return { enrolled: true, subsidyLevel: forceLevel };
            } else {
                // Random assignment for A/B testing
                const levels: ('none' | 'partial' | 'full')[] = ['none', 'partial', 'full'];
                const randomLevel = levels[Math.floor(Math.random() * levels.length)];
                await this.poolManager.enrollUser(userAddress, randomLevel);
                return { enrolled: true, subsidyLevel: randomLevel };
            }
        } catch (error) {
            console.error('Failed to enroll user:', error);
            return {
                enrolled: false,
                subsidyLevel: 'none',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Execute a subsidized transaction
     * This is the main method apps will use to send transactions with potential subsidies
     */
    async executeSubsidizedTransaction(request: TransactionRequest): Promise<SubsidyResult> {
        try {
            console.log(`💸 Executing subsidized transaction for ${request.userAddress}`);
            
            // Get user's experiment status
            const userExperiment = await this.poolManager.getUserExperiment(request.userAddress);
            
            if (!userExperiment.isActive) {
                // User not in experiment, execute normal transaction
                return await this.executeNormalTransaction(request);
            }

            // Build UserOperation for account abstraction
            const userOp = await this.buildUserOperation(request, userExperiment.subsidyLevel);
            
            // Submit to bundler
            const result = await this.submitUserOperation(userOp);
            
            // Track the transaction for analytics
            await this.trackTransaction(request.userAddress, result, userExperiment.subsidyLevel);
            
            return {
                success: true,
                txHash: result.txHash,
                subsidyAmount: result.subsidyAmount,
                actualGasCost: result.actualGasCost,
                userExperimentStatus: {
                    subsidyLevel: userExperiment.subsidyLevel as 'none' | 'partial' | 'full',
                    transactionCount: userExperiment.transactionCount + 1,
                    isActive: userExperiment.isActive
                }
            };
        } catch (error) {
            console.error('Subsidized transaction failed:', error);
            
            // Fallback to normal transaction if subsidy fails
            const fallbackResult = await this.executeNormalTransaction(request);
            
            return {
                success: fallbackResult.success,
                txHash: fallbackResult.txHash,
                error: `Subsidy failed, fallback executed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Track user retention metrics
     * Call this periodically or on user actions to measure retention impact
     */
    async trackRetention(userAddress: string): Promise<RetentionMetrics> {
        const userExperiment = await this.poolManager.getUserExperiment(userAddress);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Calculate retention period
        const firstTransactionTime = userExperiment.lastTransactionTime.getTime() / 1000;
        const retentionPeriod = Math.floor((currentTime - firstTransactionTime) / (24 * 60 * 60));
        
        // Determine if user is retained (active within last 7 days)
        const isRetained = (currentTime - userExperiment.lastTransactionTime.getTime() / 1000) < (7 * 24 * 60 * 60);
        
        const metrics: RetentionMetrics = {
            userId: userAddress,
            firstTransactionTime,
            transactionCount: userExperiment.transactionCount,
            lastActiveTime: userExperiment.lastTransactionTime.getTime() / 1000,
            retentionPeriod,
            isRetained,
            subsidyLevel: userExperiment.subsidyLevel as 'none' | 'partial' | 'full'
        };
        
        // Send metrics to analytics
        await this.sendRetentionMetrics(metrics);
        
        return metrics;
    }

    /**
     * Get experiment statistics for the app
     */
    async getAppExperimentStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        retentionByLevel: {
            none: { count: number; retentionRate: number };
            partial: { count: number; retentionRate: number };
            full: { count: number; retentionRate: number };
        };
        averageTransactionsPerUser: number;
        totalSubsidyUsed: bigint;
    }> {
        // This would query your app's user database combined with on-chain data
        return {
            totalUsers: 0,
            activeUsers: 0,
            retentionByLevel: {
                none: { count: 0, retentionRate: 0 },
                partial: { count: 0, retentionRate: 0 },
                full: { count: 0, retentionRate: 0 }
            },
            averageTransactionsPerUser: 0,
            totalSubsidyUsed: 0n
        };
    }

    /**
     * Estimate potential subsidy for a transaction
     * Useful for showing users potential savings
     */
    async estimateSubsidy(request: TransactionRequest): Promise<{
        estimatedGasCost: bigint;
        potentialSubsidy: bigint;
        userPays: bigint;
        subsidyLevel: 'none' | 'partial' | 'full';
    }> {
        const userExperiment = await this.poolManager.getUserExperiment(request.userAddress);
        
        // Estimate gas cost
        const estimatedGas = await this.estimateGas(request);
        const gasPrice = await this.provider.getFeeData();
        const estimatedGasCost = estimatedGas * (gasPrice.gasPrice || 0n);
        
        let potentialSubsidy = 0n;
        let userPays = estimatedGasCost;
        
        if (userExperiment.isActive) {
            switch (userExperiment.subsidyLevel) {
                case 'partial':
                    potentialSubsidy = estimatedGasCost / 2n;
                    userPays = estimatedGasCost - potentialSubsidy;
                    break;
                case 'full':
                    potentialSubsidy = estimatedGasCost;
                    userPays = 0n;
                    break;
            }
        }
        
        return {
            estimatedGasCost,
            potentialSubsidy,
            userPays,
            subsidyLevel: userExperiment.subsidyLevel as 'none' | 'partial' | 'full'
        };
    }

    /**
     * Private helper methods
     */
    private async buildUserOperation(request: TransactionRequest, subsidyLevel: string): Promise<any> {
        // This would build a proper EIP-4337 UserOperation
        // Including paymaster data for the subsidy contract
        return {
            sender: request.userAddress,
            nonce: await this.getUserNonce(request.userAddress),
            initCode: '0x',
            callData: this.encodeCallData(request),
            callGasLimit: request.gasLimit || '100000',
            verificationGasLimit: '100000',
            preVerificationGas: '21000',
            maxFeePerGas: '2000000000',
            maxPriorityFeePerGas: '1000000000',
            paymasterAndData: this.encodePaymasterData(subsidyLevel),
            signature: '0x'
        };
    }

    private async submitUserOperation(userOp: any): Promise<{
        txHash: string;
        subsidyAmount: bigint;
        actualGasCost: bigint;
    }> {
        // Submit to bundler and wait for execution
        const result = await this.bundlerProvider.send('eth_sendUserOperation', [
            userOp,
            this.config.paymasterAddress
        ]);
        
        // Wait for transaction receipt
        const receipt = await this.provider.waitForTransaction(result);
        
        return {
            txHash: receipt!.hash,
            subsidyAmount: 0n, // Would be calculated from logs
            actualGasCost: receipt!.gasUsed * receipt!.gasPrice
        };
    }

    private async executeNormalTransaction(request: TransactionRequest): Promise<SubsidyResult> {
        // Fallback to normal transaction execution
        return {
            success: false,
            error: 'Normal transaction execution not implemented'
        };
    }

    private async trackTransaction(
        userAddress: string, 
        result: any, 
        subsidyLevel: string
    ): Promise<void> {
        // Send transaction data to analytics system
        console.log(`📊 Tracking transaction for ${userAddress} with ${subsidyLevel} subsidy`);
    }

    private async sendRetentionMetrics(metrics: RetentionMetrics): Promise<void> {
        // Send retention data to analytics
        console.log(`📈 Retention metrics:`, metrics);
    }

    private async estimateGas(request: TransactionRequest): Promise<bigint> {
        return BigInt(21000); // Simplified estimate
    }

    private async getUserNonce(userAddress: string): Promise<string> {
        return '0'; // Would get actual nonce
    }

    private encodeCallData(request: TransactionRequest): string {
        // Encode the transaction call data
        return request.data || '0x';
    }

    private encodePaymasterData(subsidyLevel: string): string {
        // Encode paymaster data for the subsidy contract
        return ethers.concat([
            this.config.paymasterAddress,
            '0x' // Additional paymaster data
        ]);
    }

    private getBundlerUrl(): string {
        return this.config.bundlerUrl;
    }
}

/**
 * Simplified helper functions for easy integration
 */

/**
 * Initialize the SDK with minimal configuration
 */
export function createSubsidySDK(config: SDKConfig): SubsidyIntegrationSDK {
    return new SubsidyIntegrationSDK(config);
}

/**
 * Quick setup for common use cases
 */
export async function quickSetup(options: {
    chainId: number;
    paymasterAddress: string;
    bundlerUrl: string;
    userAddress: string;
}): Promise<{
    sdk: SubsidyIntegrationSDK;
    userEnrolled: boolean;
    subsidyLevel: 'none' | 'partial' | 'full';
}> {
    const sdk = createSubsidySDK({
        chainId: options.chainId,
        paymasterAddress: options.paymasterAddress,
        bundlerUrl: options.bundlerUrl
    });
    
    const enrollment = await sdk.enrollUser(options.userAddress);
    
    return {
        sdk,
        userEnrolled: enrollment.enrolled,
        subsidyLevel: enrollment.subsidyLevel
    };
}

/**
 * React hook for easy integration (if using React)
 */
export function useSubsidyExperiment(userAddress: string, config: SDKConfig) {
    // This would be implemented as a proper React hook
    return {
        sdk: null,
        isEnrolled: false,
        subsidyLevel: 'none' as const,
        executeTransaction: async () => ({ success: false }),
        retentionMetrics: null
    };
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { createSubsidySDK } from '@trellis/subsidy-sdk';
 * 
 * const sdk = createSubsidySDK({
 *   chainId: 8453, // Base
 *   paymasterAddress: '0x...',
 *   bundlerUrl: 'https://api.pimlico.io/v2/base/rpc'
 * });
 * 
 * // Enroll user in experiment
 * await sdk.enrollUser(userAddress);
 * 
 * // Execute subsidized transaction
 * const result = await sdk.executeSubsidizedTransaction({
 *   to: contractAddress,
 *   data: encodedData,
 *   userAddress: userAddress
 * });
 * 
 * // Track retention
 * const retention = await sdk.trackRetention(userAddress);
 * ```
 */