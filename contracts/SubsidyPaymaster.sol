// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SubsidyPaymaster
 * @dev Experimental paymaster for testing cost subsidy impact on user retention
 * @notice This contract subsidizes gas fees at different levels for A/B testing
 */
contract SubsidyPaymaster is IPaymaster, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    IEntryPoint public immutable entryPoint;
    
    // Subsidy levels: 0% (no subsidy), 50% (half cost), 100% (full subsidy)
    enum SubsidyLevel { NONE, PARTIAL, FULL }
    
    // Experiment tracking
    struct UserExperiment {
        SubsidyLevel subsidyLevel;
        uint256 transactionCount;
        uint256 lastTransactionTime;
        bool isActive;
    }
    
    // Analytics tracking
    struct TransactionMetrics {
        address user;
        SubsidyLevel subsidyLevel;
        uint256 gasUsed;
        uint256 gasCost;
        uint256 subsidyAmount;
        uint256 timestamp;
        address targetContract;
        bytes4 methodSignature;
    }
    
    mapping(address => UserExperiment) public userExperiments;
    mapping(address => bool) public authorizedApps;
    mapping(bytes32 => bool) public usedNonces;
    
    TransactionMetrics[] public transactionHistory;
    
    // Pool management
    uint256 public totalSubsidyPool;
    uint256 public totalSubsidiesUsed;
    uint256 public maxSubsidyPerUser = 0.1 ether; // Prevent abuse
    
    // Experiment configuration
    uint256 public experimentDuration = 30 days;
    uint256 public maxTransactionsPerUser = 100;
    
    // Events for analytics
    event UserEnrolled(address indexed user, SubsidyLevel subsidyLevel);
    event TransactionSubsidized(
        address indexed user, 
        uint256 gasCost, 
        uint256 subsidyAmount,
        SubsidyLevel subsidyLevel
    );
    event SubsidyPoolFunded(uint256 amount);
    event ExperimentEnded(address indexed user, uint256 totalTransactions);
    
    modifier onlyAuthorizedApp() {
        require(authorizedApps[msg.sender], "Unauthorized app");
        _;
    }
    
    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        _;
    }
    
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }
    
    /**
     * @dev Fund the subsidy pool for experiments
     */
    function fundSubsidyPool() external payable onlyOwner {
        totalSubsidyPool += msg.value;
        emit SubsidyPoolFunded(msg.value);
    }
    
    /**
     * @dev Authorize an app to use subsidies
     */
    function authorizeApp(address app) external onlyOwner {
        authorizedApps[app] = true;
    }
    
    /**
     * @dev Enroll user in subsidy experiment with random assignment
     */
    function enrollUser(address user, uint256 randomSeed) external onlyAuthorizedApp {
        require(!userExperiments[user].isActive, "User already enrolled");
        
        // Random assignment to experiment groups (33% each)
        SubsidyLevel level = SubsidyLevel(randomSeed % 3);
        
        userExperiments[user] = UserExperiment({
            subsidyLevel: level,
            transactionCount: 0,
            lastTransactionTime: block.timestamp,
            isActive: true
        });
        
        emit UserEnrolled(user, level);
    }
    
    /**
     * @dev Manually assign user to specific subsidy level (for controlled testing)
     */
    function assignUserToLevel(address user, SubsidyLevel level) external onlyOwner {
        userExperiments[user] = UserExperiment({
            subsidyLevel: level,
            transactionCount: 0,
            lastTransactionTime: block.timestamp,
            isActive: true
        });
        
        emit UserEnrolled(user, level);
    }
    
    /**
     * @dev Validate paymaster user operation
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        address user = userOp.sender;
        UserExperiment storage experiment = userExperiments[user];
        
        // Check if user is enrolled and experiment is still active
        if (!experiment.isActive || 
            block.timestamp > experiment.lastTransactionTime + experimentDuration ||
            experiment.transactionCount >= maxTransactionsPerUser) {
            return ("", 1); // Reject
        }
        
        // Calculate subsidy amount based on experiment level
        uint256 subsidyAmount = 0;
        if (experiment.subsidyLevel == SubsidyLevel.PARTIAL) {
            subsidyAmount = maxCost / 2; // 50% subsidy
        } else if (experiment.subsidyLevel == SubsidyLevel.FULL) {
            subsidyAmount = maxCost; // 100% subsidy
        }
        
        // Check if we have enough funds for subsidy
        if (subsidyAmount > 0 && totalSubsidyPool - totalSubsidiesUsed < subsidyAmount) {
            return ("", 1); // Reject if insufficient funds
        }
        
        // Encode context for postOp
        context = abi.encode(user, subsidyAmount, maxCost);
        return (context, 0); // Accept
    }
    
    /**
     * @dev Post-operation hook to handle subsidies and record metrics
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override onlyEntryPoint {
        if (mode == PostOpMode.opReverted) {
            return; // Don't subsidize reverted operations
        }
        
        (address user, uint256 subsidyAmount, uint256 maxCost) = abi.decode(
            context, 
            (address, uint256, uint256)
        );
        
        UserExperiment storage experiment = userExperiments[user];
        
        // Calculate actual subsidy based on real gas cost
        uint256 actualSubsidy = 0;
        if (experiment.subsidyLevel == SubsidyLevel.PARTIAL) {
            actualSubsidy = actualGasCost / 2;
        } else if (experiment.subsidyLevel == SubsidyLevel.FULL) {
            actualSubsidy = actualGasCost;
        }
        
        // Update experiment tracking
        experiment.transactionCount++;
        experiment.lastTransactionTime = block.timestamp;
        totalSubsidiesUsed += actualSubsidy;
        
        // Record transaction metrics for analytics
        transactionHistory.push(TransactionMetrics({
            user: user,
            subsidyLevel: experiment.subsidyLevel,
            gasUsed: actualGasCost,
            gasCost: actualGasCost,
            subsidyAmount: actualSubsidy,
            timestamp: block.timestamp,
            targetContract: address(0), // Could be extracted from userOp.callData
            methodSignature: bytes4(0) // Could be extracted from userOp.callData
        }));
        
        emit TransactionSubsidized(user, actualGasCost, actualSubsidy, experiment.subsidyLevel);
        
        // End experiment if user hits limits
        if (experiment.transactionCount >= maxTransactionsPerUser ||
            block.timestamp > experiment.lastTransactionTime + experimentDuration) {
            experiment.isActive = false;
            emit ExperimentEnded(user, experiment.transactionCount);
        }
    }
    
    /**
     * @dev Get user's experiment status
     */
    function getUserExperiment(address user) external view returns (UserExperiment memory) {
        return userExperiments[user];
    }
    
    /**
     * @dev Get transaction history for analytics
     */
    function getTransactionHistory(uint256 offset, uint256 limit) 
        external view returns (TransactionMetrics[] memory) {
        require(offset < transactionHistory.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > transactionHistory.length) {
            end = transactionHistory.length;
        }
        
        TransactionMetrics[] memory result = new TransactionMetrics[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = transactionHistory[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get experiment statistics
     */
    function getExperimentStats() external view returns (
        uint256 totalUsers,
        uint256 activeUsers,
        uint256 totalTransactions,
        uint256[3] memory usersByLevel,
        uint256 totalSubsidized
    ) {
        // This would be implemented with proper enumeration
        // For now, returns basic pool info
        return (0, 0, transactionHistory.length, [uint256(0), 0, 0], totalSubsidiesUsed);
    }
    
    /**
     * @dev Emergency withdrawal of remaining funds
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Update experiment parameters
     */
    function updateExperimentParams(
        uint256 _experimentDuration,
        uint256 _maxTransactionsPerUser,
        uint256 _maxSubsidyPerUser
    ) external onlyOwner {
        experimentDuration = _experimentDuration;
        maxTransactionsPerUser = _maxTransactionsPerUser;
        maxSubsidyPerUser = _maxSubsidyPerUser;
    }
    
    receive() external payable {
        totalSubsidyPool += msg.value;
        emit SubsidyPoolFunded(msg.value);
    }
}