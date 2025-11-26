import { ethers, TransactionResponse, TransactionReceipt } from 'ethers';
import { Logger } from '../utils/Logger';
import { CacheService } from './CacheService';

interface QueuedTransaction {
  id: string;
  userAddress: string;
  contractName: string;
  methodName: string;
  params: any[];
  privateKey: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  nextAttemptAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  txHash?: string;
  gasLimit?: string;
  gasPrice?: string;
}

interface TransactionQueueConfig {
  maxQueueSize: number;
  maxAttempts: number;
  retryDelayBase: number;
  retryDelayMultiplier: number;
  priorityLevels: number;
  processingBatchSize: number;
}

export class TransactionQueueService {
  private cache: CacheService;
  private logger: Logger;
  private config: TransactionQueueConfig;
  private isProcessing: boolean = false;
  private userNonces: Map<string, number> = new Map();

  constructor(cache: CacheService) {
    this.cache = cache;
    this.logger = new Logger('TransactionQueueService');
    
    this.config = {
      maxQueueSize: 1000,
      maxAttempts: 3,
      retryDelayBase: 5000, // 5 seconds
      retryDelayMultiplier: 2,
      priorityLevels: 3,
      processingBatchSize: 10
    };

    // Start processing loop
    this.startProcessingLoop();
  }

  public async queueTransaction(
    userAddress: string,
    contractName: string,
    methodName: string,
    params: any[],
    privateKey: string,
    priority: number = 1
  ): Promise<string> {
    try {
      // Check queue size
      const queueSize = await this.getQueueSize();
      if (queueSize >= this.config.maxQueueSize) {
        throw new Error('Transaction queue is full');
      }

      const transaction: QueuedTransaction = {
        id: this.generateTransactionId(),
        userAddress: userAddress.toLowerCase(),
        contractName,
        methodName,
        params,
        privateKey,
        priority: Math.min(priority, this.config.priorityLevels),
        attempts: 0,
        maxAttempts: this.config.maxAttempts,
        createdAt: Date.now(),
        nextAttemptAt: Date.now(),
        status: 'pending'
      };

      // Add to queue
      await this.addToQueue(transaction);

      this.logger.info('Transaction queued', {
        transactionId: transaction.id,
        userAddress,
        contractName,
        methodName,
        priority
      });

      return transaction.id;
    } catch (error) {
      this.logger.error('Failed to queue transaction:', error);
      throw error;
    }
  }

  public async getTransactionStatus(transactionId: string): Promise<QueuedTransaction | null> {
    try {
      return await this.cache.get(`tx_queue:${transactionId}`);
    } catch (error) {
      this.logger.error('Failed to get transaction status:', error);
      return null;
    }
  }

  public async getUserTransactions(userAddress: string, status?: string): Promise<QueuedTransaction[]> {
    try {
      const userQueueKey = `user_tx_queue:${userAddress.toLowerCase()}`;
      const transactionIds: string[] = await this.cache.get(userQueueKey) || [];
      
      const transactions: QueuedTransaction[] = [];
      for (const txId of transactionIds) {
        const tx = await this.cache.get(`tx_queue:${txId}`) as QueuedTransaction | null;
        if (tx && (!status || tx.status === status)) {
          transactions.push(tx);
        }
      }

      return transactions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      this.logger.error('Failed to get user transactions:', error);
      return [];
    }
  }

  public async cancelTransaction(transactionId: string, userAddress: string): Promise<boolean> {
    try {
      const transaction = await this.getTransactionStatus(transactionId) as QueuedTransaction | null;
      
      if (!transaction) {
        return false;
      }

      if (transaction.userAddress !== userAddress.toLowerCase()) {
        throw new Error('Unauthorized to cancel this transaction');
      }

      if (transaction.status !== 'pending') {
        throw new Error('Cannot cancel transaction that is not pending');
      }

      transaction.status = 'failed';
      transaction.error = 'Cancelled by user';
      
      await this.cache.set(`tx_queue:${transactionId}`, transaction, 3600);
      await this.removeFromUserQueue(userAddress, transactionId);

      this.logger.info('Transaction cancelled', { transactionId, userAddress });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel transaction:', error);
      throw error;
    }
  }

  private async startProcessingLoop(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, 2000); // Process every 2 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingTransactions = await this.getPendingTransactions();
      
      if (pendingTransactions.length === 0) {
        return;
      }

      // Sort by priority and creation time
      pendingTransactions.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.nextAttemptAt - b.nextAttemptAt; // Earlier attempt first
      });

      // Process batch
      const batch = pendingTransactions.slice(0, this.config.processingBatchSize);
      
      for (const transaction of batch) {
        if (Date.now() >= transaction.nextAttemptAt) {
          await this.processTransaction(transaction);
        }
      }

      this.logger.debug(`Processed transaction batch`, {
        batchSize: batch.length,
        remainingInQueue: pendingTransactions.length - batch.length
      });

    } catch (error) {
      this.logger.error('Error processing transaction queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTransaction(transaction: QueuedTransaction): Promise<void> {
    try {
      transaction.status = 'processing';
      await this.cache.set(`tx_queue:${transaction.id}`, transaction, 3600);

      // Get current nonce for user
      const currentNonce = await this.getUserNonce(transaction.userAddress);
      
      // Execute transaction with nonce management
      const result = await this.executeTransactionWithNonce(transaction, currentNonce);
      
      // Mark as completed
      transaction.status = 'completed';
      transaction.txHash = result.txHash;
      transaction.error = undefined;
      
      await this.cache.set(`tx_queue:${transaction.id}`, transaction, 3600);
      await this.removeFromUserQueue(transaction.userAddress, transaction.id);

      this.logger.info('Transaction completed successfully', {
        transactionId: transaction.id,
        txHash: result.txHash,
        blockNumber: result.receipt?.blockNumber
      });

    } catch (error) {
      transaction.attempts++;
      
      if (transaction.attempts >= transaction.maxAttempts) {
        transaction.status = 'failed';
        transaction.error = error instanceof Error ? error.message : 'Unknown error';
        
        this.logger.error('Transaction failed after max attempts', {
          transactionId: transaction.id,
          attempts: transaction.attempts,
          error: transaction.error
        });
      } else {
        transaction.status = 'pending';
        transaction.nextAttemptAt = Date.now() + (this.config.retryDelayBase * Math.pow(this.config.retryDelayMultiplier, transaction.attempts - 1));
        
        this.logger.warn('Transaction failed, retrying', {
          transactionId: transaction.id,
          attempts: transaction.attempts,
          nextAttemptAt: new Date(transaction.nextAttemptAt).toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      await this.cache.set(`tx_queue:${transaction.id}`, transaction, 3600);
    }
  }

  private async executeTransactionWithNonce(
    transaction: QueuedTransaction,
    currentNonce: number
  ): Promise<{ txHash: string; receipt?: TransactionReceipt }> {
    // This would integrate with the ContractRegistry
    // For now, we'll simulate the transaction execution
    
    const txHash = ethers.keccak256(ethers.toUtf8Bytes(`${transaction.id}:${Date.now()}`));
    
    // Simulate blockchain confirmation time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const receipt: TransactionReceipt = {
      to: '0x' + '0'.repeat(40),
      from: transaction.userAddress,
      contractAddress: null,
      transactionIndex: 0,
      gasUsed: ethers.toBigInt('21000'),
      logsBloom: '0x',
      blockHash: ethers.keccak256(ethers.toUtf8Bytes('block' + Date.now())),
      transactionHash: txHash,
      logs: [],
      blockNumber: Math.floor(Date.now() / 12000), // Approximate block number
      cumulativeGasUsed: ethers.toBigInt('21000'),
      effectiveGasPrice: ethers.toBigInt('20000000000'),
      type: 0,
      status: 1
    } as any;

    return { txHash, receipt };
  }

  private async getUserNonce(userAddress: string): Promise<number> {
    // In a real implementation, this would query the blockchain
    // For now, we'll use a simple counter
    const currentNonce = this.userNonces.get(userAddress) || 0;
    this.userNonces.set(userAddress, currentNonce + 1);
    return currentNonce;
  }

  private async addToQueue(transaction: QueuedTransaction): Promise<void> {
    // Add to main queue
    await this.cache.set(`tx_queue:${transaction.id}`, transaction, 3600);
    
    // Add to user queue
    const userQueueKey = `user_tx_queue:${transaction.userAddress}`;
    const userQueue: string[] = await this.cache.get(userQueueKey) || [];
    userQueue.push(transaction.id);
    await this.cache.set(userQueueKey, userQueue, 3600);
  }

  private async removeFromUserQueue(userAddress: string, transactionId: string): Promise<void> {
    const userQueueKey = `user_tx_queue:${userAddress.toLowerCase()}`;
    const userQueue = await this.cache.get(userQueueKey) || [];
    
    const updatedQueue = userQueue.filter((id: string) => id !== transactionId);
    await this.cache.set(userQueueKey, updatedQueue, 3600);
  }

  private async getPendingTransactions(): Promise<QueuedTransaction[]> {
    try {
      // Get all pending transactions from cache
      const pattern = 'tx_queue:*';
      const pendingTransactions: QueuedTransaction[] = [];
      
      // In a real Redis implementation, this would use SCAN
      // For now, we'll return an empty array and rely on the cache implementation
      
      return pendingTransactions;
    } catch (error) {
      this.logger.error('Failed to get pending transactions:', error);
      return [];
    }
  }

  private async getQueueSize(): Promise<number> {
    try {
      // In a real implementation, this would query the cache
      return 0;
    } catch (error) {
      this.logger.error('Failed to get queue size:', error);
      return 0;
    }
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async getQueueStats(): Promise<{
    totalTransactions: number;
    pendingTransactions: number;
    processingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    averageProcessingTime: number;
  }> {
    try {
      // Mock statistics for now
      return {
        totalTransactions: 0,
        pendingTransactions: 0,
        processingTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        averageProcessingTime: 0
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      return {
        totalTransactions: 0,
        pendingTransactions: 0,
        processingTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        averageProcessingTime: 0
      };
    }
  }

  public async clearCompletedTransactions(olderThanHours: number = 24): Promise<number> {
    try {
      // Clear old completed transactions from cache
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      // In a real implementation, this would scan and clean up old transactions
      const clearedCount = 0;
      
      this.logger.info('Cleared completed transactions', { 
        clearedCount, 
        olderThanHours 
      });
      
      return clearedCount;
    } catch (error) {
      this.logger.error('Failed to clear completed transactions:', error);
      return 0;
    }
  }
}
