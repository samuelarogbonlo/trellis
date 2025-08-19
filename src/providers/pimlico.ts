import axios from 'axios';
import { BaseProvider } from './base.js';
import { TransactionResult, TestTransaction } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class PimlicoProvider extends BaseProvider {
  async testTransaction(transaction: TestTransaction): Promise<TransactionResult> {
    const startTime = Date.now();

    try {
      const bundlerUrl = this.formatUrl(this.config.bundlerUrl!, this.config.apiKey);
      
      const userOperation = {
        sender: transaction.to,
        nonce: '0x0',
        initCode: '0x',
        callData: transaction.data || '0x',
        callGasLimit: transaction.gasLimit || '0x5208',
        verificationGasLimit: '0x10000',
        preVerificationGas: '0x5208',
        maxFeePerGas: '0x59682f00',
        maxPriorityFeePerGas: '0x59682f00',
        paymasterAndData: '0x',
        signature: '0x',
      };

      const [gasEstimate, estimateTime] = await this.measureExecutionTime(async () => {
        const response = await axios.post(
          bundlerUrl,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_estimateUserOperationGas',
            params: [userOperation, this.chain.entryPointAddress],
          },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        return response.data;
      });

      if (gasEstimate.error) {
        throw new Error(gasEstimate.error.message);
      }

      const gasUsed = BigInt(gasEstimate.result.callGasLimit);
      const gasPrice = BigInt(userOperation.maxFeePerGas);
      const gasCost = gasUsed * gasPrice;
      
      const block = await this.getLatestBlock();
      const baseFee = block?.baseFeePerGas;
      const mevRisk = this.calculateMevRisk(gasPrice, baseFee || undefined);

      const hiddenFees = gasCost * 10n / 100n;

      return {
        provider: this.config.name,
        chain: this.chain.name,
        success: true,
        gasUsed,
        gasCost,
        actualCost: gasCost + hiddenFees,
        hiddenFees,
        executionTime: estimateTime,
        mevRisk,
        timestamp: startTime,
      };
    } catch (error) {
      logger.debug(`Pimlico test failed on ${this.chain.name}:`, error);
      
      return {
        provider: this.config.name,
        chain: this.chain.name,
        success: false,
        errorMessage: this.parseError(error),
        executionTime: Date.now() - startTime,
        timestamp: startTime,
      };
    }
  }
}