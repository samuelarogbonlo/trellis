import { ethers } from 'hardhat';
import { SubsidyPaymaster } from '../typechain-types';

// Deployment configuration for different networks
const DEPLOYMENT_CONFIG = {
    'base-sepolia': {
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        bundlerUrl: 'https://api.pimlico.io/v2/base-sepolia/rpc',
        initialFunding: ethers.parseEther('0.1'), // 0.1 ETH initial funding
        chainId: 84532
    },
    'sepolia': {
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc',
        initialFunding: ethers.parseEther('0.05'), // 0.05 ETH initial funding
        chainId: 11155111
    },
    'polygon-mumbai': {
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        bundlerUrl: 'https://api.pimlico.io/v2/polygon-mumbai/rpc',
        initialFunding: ethers.parseEther('1'), // 1 MATIC initial funding
        chainId: 80001
    }
};

interface DeploymentResult {
    paymasterAddress: string;
    transactionHash: string;
    gasUsed: bigint;
    deploymentCost: bigint;
    network: string;
    blockNumber: number;
}

/**
 * Deploy SubsidyPaymaster contract to testnet
 */
async function deploySubsidyPaymaster(networkName: keyof typeof DEPLOYMENT_CONFIG): Promise<DeploymentResult> {
    console.log(`🚀 Deploying SubsidyPaymaster to ${networkName}...`);
    
    const config = DEPLOYMENT_CONFIG[networkName];
    const [deployer] = await ethers.getSigners();
    
    console.log(`📋 Deployment Configuration:`);
    console.log(`  Network: ${networkName}`);
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  EntryPoint: ${config.entryPoint}`);
    console.log(`  Initial Funding: ${ethers.formatEther(config.initialFunding)} ETH`);
    
    // Check deployer balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`  Deployer Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < config.initialFunding * 2n) {
        throw new Error(`Insufficient balance. Need at least ${ethers.formatEther(config.initialFunding * 2n)} ETH for deployment and funding`);
    }
    
    // Deploy contract
    const SubsidyPaymaster = await ethers.getContractFactory('SubsidyPaymaster');
    console.log(`📦 Deploying contract...`);
    
    const paymaster = await SubsidyPaymaster.deploy(config.entryPoint);
    const deploymentTx = paymaster.deploymentTransaction();
    
    console.log(`⏳ Waiting for deployment confirmation...`);
    await paymaster.waitForDeployment();
    
    const receipt = await deploymentTx?.wait();
    const paymasterAddress = await paymaster.getAddress();
    
    console.log(`✅ Contract deployed at: ${paymasterAddress}`);
    console.log(`📋 Transaction Hash: ${receipt?.hash}`);
    console.log(`⛽ Gas Used: ${receipt?.gasUsed}`);
    console.log(`💰 Deployment Cost: ${ethers.formatEther(receipt?.gasUsed || 0n)} ETH`);
    
    // Fund the paymaster with initial amount
    console.log(`💰 Funding paymaster with ${ethers.formatEther(config.initialFunding)} ETH...`);
    const fundTx = await paymaster.fundSubsidyPool({ value: config.initialFunding });
    await fundTx.wait();
    console.log(`✅ Paymaster funded successfully`);
    
    return {
        paymasterAddress,
        transactionHash: receipt?.hash || '',
        gasUsed: receipt?.gasUsed || 0n,
        deploymentCost: receipt?.gasUsed || 0n,
        network: networkName,
        blockNumber: receipt?.blockNumber || 0
    };
}

/**
 * Configure the deployed paymaster with experiment parameters
 */
async function configurePaymaster(
    paymasterAddress: string, 
    networkName: keyof typeof DEPLOYMENT_CONFIG
): Promise<void> {
    console.log(`⚙️ Configuring paymaster at ${paymasterAddress}...`);
    
    const paymaster = await ethers.getContractAt('SubsidyPaymaster', paymasterAddress);
    
    // Set experiment parameters
    const experimentDuration = 30 * 24 * 60 * 60; // 30 days
    const maxTransactionsPerUser = 100;
    const maxSubsidyPerUser = ethers.parseEther('0.1'); // 0.1 ETH max per user
    
    console.log(`📋 Setting experiment parameters:`);
    console.log(`  Duration: ${experimentDuration / (24 * 60 * 60)} days`);
    console.log(`  Max transactions per user: ${maxTransactionsPerUser}`);
    console.log(`  Max subsidy per user: ${ethers.formatEther(maxSubsidyPerUser)} ETH`);
    
    const configTx = await paymaster.updateExperimentParams(
        experimentDuration,
        maxTransactionsPerUser,
        maxSubsidyPerUser
    );
    await configTx.wait();
    
    console.log(`✅ Paymaster configured successfully`);
}

/**
 * Verify contract deployment and functionality
 */
async function verifyDeployment(
    paymasterAddress: string,
    networkName: keyof typeof DEPLOYMENT_CONFIG
): Promise<boolean> {
    console.log(`🔍 Verifying deployment at ${paymasterAddress}...`);
    
    try {
        const paymaster = await ethers.getContractAt('SubsidyPaymaster', paymasterAddress);
        const config = DEPLOYMENT_CONFIG[networkName];
        
        // Check basic functionality
        const entryPoint = await paymaster.entryPoint();
        const totalPool = await paymaster.totalSubsidyPool();
        const owner = await paymaster.owner();
        
        console.log(`📋 Verification Results:`);
        console.log(`  EntryPoint: ${entryPoint} ${entryPoint === config.entryPoint ? '✅' : '❌'}`);
        console.log(`  Total Pool: ${ethers.formatEther(totalPool)} ETH`);
        console.log(`  Owner: ${owner}`);
        
        // Verify pool has been funded
        if (totalPool < config.initialFunding) {
            console.log(`❌ Pool funding verification failed`);
            return false;
        }
        
        console.log(`✅ Deployment verification successful`);
        return true;
    } catch (error) {
        console.error(`❌ Verification failed:`, error);
        return false;
    }
}

/**
 * Create test users and enroll them in experiments
 */
async function setupTestUsers(
    paymasterAddress: string,
    numUsers: number = 10
): Promise<string[]> {
    console.log(`👥 Setting up ${numUsers} test users...`);
    
    const paymaster = await ethers.getContractAt('SubsidyPaymaster', paymasterAddress);
    const [deployer] = await ethers.getSigners();
    
    // Authorize deployer as an app (for testing)
    const authTx = await paymaster.authorizeApp(deployer.address);
    await authTx.wait();
    console.log(`✅ Deployer authorized as test app`);
    
    const testUsers: string[] = [];
    
    for (let i = 0; i < numUsers; i++) {
        // Create random test user address
        const wallet = ethers.Wallet.createRandom();
        const userAddress = wallet.address;
        testUsers.push(userAddress);
        
        // Enroll user with random subsidy level
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        try {
            const enrollTx = await paymaster.enrollUser(userAddress, randomSeed);
            await enrollTx.wait();
            
            const experiment = await paymaster.getUserExperiment(userAddress);
            const levelNames = ['None', 'Partial', 'Full'];
            console.log(`  👤 User ${i + 1}: ${userAddress} -> ${levelNames[experiment.subsidyLevel]} subsidy`);
        } catch (error) {
            console.error(`❌ Failed to enroll user ${i + 1}:`, error);
        }
        
        // Add delay to prevent nonce conflicts
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ ${testUsers.length} test users enrolled`);
    return testUsers;
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(result: DeploymentResult, testUsers: string[]): void {
    const report = `
# Subsidy Paymaster Deployment Report

## Deployment Details
- **Network**: ${result.network}
- **Contract Address**: ${result.paymasterAddress}
- **Transaction Hash**: ${result.transactionHash}
- **Block Number**: ${result.blockNumber}
- **Gas Used**: ${result.gasUsed.toString()}
- **Deployment Cost**: ${ethers.formatEther(result.deploymentCost)} ETH

## Configuration
- **Experiment Duration**: 30 days
- **Max Transactions per User**: 100
- **Max Subsidy per User**: 0.1 ETH

## Test Setup
- **Test Users Enrolled**: ${testUsers.length}
- **Subsidy Groups**: 3 (None, Partial 50%, Full 100%)

## Next Steps
1. Begin partner app integration testing
2. Monitor pool utilization and user behavior
3. Collect retention data for analysis
4. Adjust parameters based on initial results

## Integration Example
\`\`\`typescript
import { createSubsidySDK } from '@trellis/subsidy-sdk';

const sdk = createSubsidySDK({
  chainId: ${DEPLOYMENT_CONFIG[result.network as keyof typeof DEPLOYMENT_CONFIG].chainId},
  paymasterAddress: '${result.paymasterAddress}',
  bundlerUrl: '${DEPLOYMENT_CONFIG[result.network as keyof typeof DEPLOYMENT_CONFIG].bundlerUrl}'
});

// Enroll user and execute subsidized transaction
await sdk.enrollUser(userAddress);
const result = await sdk.executeSubsidizedTransaction({
  to: contractAddress,
  data: encodedData,
  userAddress: userAddress
});
\`\`\`

Generated on: ${new Date().toISOString()}
`;
    
    console.log(report);
    
    // Save report to file
    require('fs').writeFileSync(
        `deployment-report-${result.network}-${Date.now()}.md`,
        report
    );
    console.log(`📄 Deployment report saved to deployment-report-${result.network}-${Date.now()}.md`);
}

/**
 * Main deployment function
 */
async function main() {
    const args = process.argv.slice(2);
    const networkName = args[0] as keyof typeof DEPLOYMENT_CONFIG;
    
    if (!networkName || !DEPLOYMENT_CONFIG[networkName]) {
        console.error(`❌ Invalid network. Supported networks: ${Object.keys(DEPLOYMENT_CONFIG).join(', ')}`);
        process.exit(1);
    }
    
    try {
        console.log(`🎯 Starting Phase 2.1 Subsidy System Deployment`);
        console.log(`📋 Target Network: ${networkName}`);
        console.log(`⏰ Start Time: ${new Date().toISOString()}`);
        console.log('='.repeat(60));
        
        // Deploy paymaster
        const deploymentResult = await deploySubsidyPaymaster(networkName);
        
        // Configure paymaster
        await configurePaymaster(deploymentResult.paymasterAddress, networkName);
        
        // Verify deployment
        const verificationPassed = await verifyDeployment(deploymentResult.paymasterAddress, networkName);
        if (!verificationPassed) {
            throw new Error('Deployment verification failed');
        }
        
        // Setup test users
        const testUsers = await setupTestUsers(deploymentResult.paymasterAddress, 12);
        
        // Generate report
        generateDeploymentReport(deploymentResult, testUsers);
        
        console.log('='.repeat(60));
        console.log(`🎉 Phase 2.1 Subsidy System deployed successfully!`);
        console.log(`📍 Contract Address: ${deploymentResult.paymasterAddress}`);
        console.log(`🔗 Network: ${networkName}`);
        console.log(`⏰ Completion Time: ${new Date().toISOString()}`);
        
        // Final instructions
        console.log(`\n📋 Next Steps:`);
        console.log(`1. Update your app's SDK configuration with the new paymaster address`);
        console.log(`2. Begin user enrollment and transaction testing`);
        console.log(`3. Monitor the analytics dashboard for real-time metrics`);
        console.log(`4. Fund the pool as needed based on usage patterns`);
        
    } catch (error) {
        console.error(`❌ Deployment failed:`, error);
        process.exit(1);
    }
}

// Execute deployment if this script is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

export { deploySubsidyPaymaster, configurePaymaster, verifyDeployment, setupTestUsers };