import { Router, Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { Logger } from '../utils/Logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

export class TreasuryRouter {
  private router: Router;
  private contractRegistry: ContractRegistry;
  private logger: Logger;

  constructor(contractRegistry: ContractRegistry) {
    this.router = Router();
    this.contractRegistry = contractRegistry;
    this.logger = new Logger('TreasuryRouter');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public endpoints (read-only)
    this.router.get('/balance', this.getTreasuryBalance.bind(this));
    this.router.get('/allocations', this.getBudgetAllocations.bind(this));
    this.router.get('/allocations/:project', this.getProjectBudget.bind(this));
    this.router.get('/transactions', this.getTreasuryTransactions.bind(this));
    this.router.get('/stats', this.getTreasuryStats.bind(this));
    this.router.get('/tokens', this.getSupportedTokens.bind(this));

    // Authenticated endpoints (write operations)
    this.router.post('/withdraw', 
      authMiddleware, 
      validateRequest(schemas.withdrawFunds), 
      this.withdrawFunds.bind(this)
    );

    this.router.post('/allocate', 
      authMiddleware, 
      validateRequest(schemas.allocateBudget), 
      this.allocateBudget.bind(this)
    );

    this.router.post('/schedule-payment', 
      authMiddleware, 
      validateRequest(schemas.schedulePayment), 
      this.schedulePayment.bind(this)
    );

    this.router.post('/emergency-withdraw', 
      authMiddleware, 
      validateRequest(schemas.emergencyWithdraw), 
      this.emergencyWithdraw.bind(this)
    );

    this.router.post('/add-operator', 
      authMiddleware, 
      validateRequest(schemas.addOperator), 
      this.addOperator.bind(this)
    );

    this.router.post('/remove-operator', 
      authMiddleware, 
      validateRequest(schemas.removeOperator), 
      this.removeOperator.bind(this)
    );
  }

  public getRouter(): Router {
    return this.router;
  }

  // ============ Public Read Endpoints ============

  private async getTreasuryBalance(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      
      const treasury = this.contractRegistry.getContract('PitchforksTreasury');
      
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      let balances;
      
      if (token) {
        // Get specific token balance
        const balance = await treasury.getTreasuryBalance(token as string);
        balances = {
          [token as string]: balance.toString()
        };
      } else {
        // Get all token balances (mock for now)
        balances = {
          '0x536d98Ad83F7d0230B9384e606208802ECD728FE': '10000000000000000000000', // 10K PFORK
          '0x0000000000000000000000000000000000000000': '500000000000000000' // 0.5 ETH
        };
      }

      // Calculate total USD value (mock calculation)
      let totalValueUSD = '0';
      for (const [tokenAddress, balance] of Object.entries(balances)) {
        // Mock price calculation
        const price = tokenAddress === '0x0000000000000000000000000000000000000000' ? '2000' : '1';
        const value = (BigInt(balance) * BigInt(price)) / BigInt(10**18);
        totalValueUSD = (BigInt(totalValueUSD) + value).toString();
      }

      res.json({
        success: true,
        data: {
          balances,
          totalValueUSD,
          totalTokens: Object.keys(balances).length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get treasury balance:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve treasury balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getBudgetAllocations(req: Request, res: Response): Promise<void> {
    try {
      const { project } = req.query;
      
      const treasury = this.contractRegistry.getContract('PitchforksTreasury');
      
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const projects = ['PROTOCOL', 'DEX', 'FERRY', 'ANALYST', 'APP'];
      const allocations = [];

      for (let i = 0; i < projects.length; i++) {
        try {
          const budgetDetails = await treasury.getBudgetDetails(i);
          
          allocations.push({
            projectId: i,
            projectName: projects[i],
            allocatedAmount: budgetDetails.allocatedAmount.toString(),
            spentAmount: budgetDetails.spentAmount.toString(),
            remainingAmount: (BigInt(budgetDetails.allocatedAmount) - BigInt(budgetDetails.spentAmount)).toString(),
            withdrawalLimit: budgetDetails.withdrawalLimit.toString(),
            dailyLimit: budgetDetails.dailyLimit.toString(),
            lastWithdrawalTime: new Date(budgetDetails.lastWithdrawalTime.toNumber() * 1000).toISOString(),
            dailySpent: budgetDetails.dailySpent.toString(),
            isActive: budgetDetails.isActive,
            authorizedOperators: budgetDetails.authorizedOperators,
            utilizationRate: ((BigInt(budgetDetails.spentAmount) * BigInt(10000)) / BigInt(budgetDetails.allocatedAmount)).toString()
          });
        } catch (error) {
          this.logger.warn(`Failed to get budget for project ${i}:`, error);
        }
      }

      // Filter by project if specified
      const filteredAllocations = project ? 
        allocations.filter(alloc => alloc.projectName === project.toUpperCase()) : 
        allocations;

      res.json({
        success: true,
        data: {
          allocations: filteredAllocations,
          totalAllocated: allocations.reduce((sum, alloc) => sum + BigInt(alloc.allocatedAmount), BigInt(0)).toString(),
          totalSpent: allocations.reduce((sum, alloc) => sum + BigInt(alloc.spentAmount), BigInt(0)).toString(),
          totalRemaining: allocations.reduce((sum, alloc) => sum + BigInt(alloc.remainingAmount), BigInt(0)).toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get budget allocations:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve budget allocations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getProjectBudget(req: Request, res: Response): Promise<void> {
    try {
      const { project } = req.params;
      
      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContract('PitchforksTreasury');
      
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const budgetDetails = await treasury.getBudgetDetails(projectId);
      
      res.json({
        success: true,
        data: {
          projectId,
          projectName: project.toUpperCase(),
          allocatedAmount: budgetDetails.allocatedAmount.toString(),
          spentAmount: budgetDetails.spentAmount.toString(),
          remainingAmount: (BigInt(budgetDetails.allocatedAmount) - BigInt(budgetDetails.spentAmount)).toString(),
          withdrawalLimit: budgetDetails.withdrawalLimit.toString(),
          dailyLimit: budgetDetails.dailyLimit.toString(),
          lastWithdrawalTime: new Date(budgetDetails.lastWithdrawalTime.toNumber() * 1000).toISOString(),
          dailySpent: budgetDetails.dailySpent.toString(),
          isActive: budgetDetails.isActive,
          authorizedOperators: budgetDetails.authorizedOperators,
          utilizationRate: ((BigInt(budgetDetails.spentAmount) * BigInt(10000)) / BigInt(budgetDetails.allocatedAmount)).toString(),
          canWithdrawToday: BigInt(budgetDetails.dailySpent) < BigInt(budgetDetails.dailyLimit),
          remainingDailyLimit: (BigInt(budgetDetails.dailyLimit) - BigInt(budgetDetails.dailySpent)).toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get project budget:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve project budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTreasuryTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, project, type } = req.query;
      
      // Mock transaction history - in production, this would come from event indexing
      const transactions = [
        {
          id: '1',
          type: 'withdrawal',
          project: 'PROTOCOL',
          amount: '100000000000000000000',
          token: 'PFORK',
          recipient: '0x742d...896f',
          timestamp: '2024-01-15T10:30:00Z',
          txHash: '0x1234...5678',
          status: 'completed'
        },
        {
          id: '2',
          type: 'allocation',
          project: 'DEX',
          amount: '2000000000000000000000',
          token: 'PFORK',
          recipient: '0x8f3a...2b1c',
          timestamp: '2024-01-16T14:20:00Z',
          txHash: '0xabcd...efgh',
          status: 'completed'
        },
        {
          id: '3',
          type: 'emergency_withdrawal',
          project: 'FERRY',
          amount: '50000000000000000000',
          token: 'PFORK',
          recipient: '0x9b1c...4d2e',
          timestamp: '2024-01-17T09:15:00Z',
          txHash: '0x5678...9abc',
          status: 'completed'
        }
      ];

      // Filter by project and type if specified
      let filteredTransactions = transactions;
      
      if (project) {
        filteredTransactions = filteredTransactions.filter(tx => 
          tx.project === project.toUpperCase()
        );
      }
      
      if (type) {
        filteredTransactions = filteredTransactions.filter(tx => 
          tx.type === type.toLowerCase()
        );
      }

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedTransactions = filteredTransactions.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          pagination: {
            total: filteredTransactions.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < filteredTransactions.length
          },
          totalVolume: transactions.reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0)).toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get treasury transactions:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve treasury transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTreasuryStats(req: Request, res: Response): Promise<void> {
    try {
      const treasury = this.contractRegistry.getContract('PitchforksTreasury');
      
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      // Mock comprehensive statistics
      const stats = {
        totalValue: '15000000000000000000000', // 15K tokens total
        totalAllocated: '12000000000000000000000', // 12K allocated
        totalSpent: '3500000000000000000000', // 3.5K spent
        utilizationRate: '2917', // 29.17% utilization
        activeProjects: 3,
        totalOperators: 8,
        emergencyWithdrawals24h: 0,
        scheduledPayments: 5,
        nextPaymentDate: '2024-01-20T00:00:00Z',
        monthlyBurnRate: '500000000000000000000', // 500 tokens per month
        runwayMonths: 24,
        topProjects: [
          { name: 'DEX', allocated: '5000000000000000000000', spent: '1500000000000000000000' },
          { name: 'PROTOCOL', allocated: '4000000000000000000000', spent: '1200000000000000000000' },
          { name: 'FERRY', allocated: '3000000000000000000000', spent: '800000000000000000000' }
        ]
      };

      res.json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get treasury stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve treasury statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getSupportedTokens(req: Request, res: Response): Promise<void> {
    try {
      // Mock supported tokens
      const supportedTokens = [
        {
          address: '0x536d98Ad83F7d0230B9384e606208802ECD728FE',
          symbol: 'PFORK',
          name: 'Pitchforks Token',
          decimals: 18,
          balance: '10000000000000000000000',
          valueUSD: '10000'
        },
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '500000000000000000',
          valueUSD: '1000'
        },
        {
          address: '0xA0b86a33E6417c5c8c5c4c8c8c8c8c8c8c8c8c8c',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          balance: '5000000000',
          valueUSD: '5000'
        }
      ];

      res.json({
        success: true,
        data: {
          tokens: supportedTokens,
          totalTokens: supportedTokens.length,
          totalValueUSD: supportedTokens.reduce((sum, token) => sum + parseFloat(token.valueUSD), 0).toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get supported tokens:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve supported tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Authenticated Write Endpoints ============

  private async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      const { project, token, amount, recipient } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.withdrawFunds(projectId, token, amount, recipient);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          project,
          token,
          amount,
          recipient
        }
      });
    } catch (error) {
      this.logger.error('Failed to withdraw funds:', error);
      res.status(500).json({ 
        error: 'Failed to withdraw funds',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async allocateBudget(req: Request, res: Response): Promise<void> {
    try {
      const { project, token, allocatedAmount, withdrawalLimit, dailyLimit } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.allocateBudget(
        projectId,
        token,
        allocatedAmount,
        withdrawalLimit,
        dailyLimit
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          project,
          token,
          allocatedAmount,
          withdrawalLimit,
          dailyLimit
        }
      });
    } catch (error) {
      this.logger.error('Failed to allocate budget:', error);
      res.status(500).json({ 
        error: 'Failed to allocate budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async schedulePayment(req: Request, res: Response): Promise<void> {
    try {
      const { project, token, recipient, amount, startTime, interval, totalPayments } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.schedulePayment(
        projectId,
        token,
        recipient,
        amount,
        startTime,
        interval,
        totalPayments
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          paymentId: receipt.logs[0]?.args?.paymentId?.toString(),
          project,
          token,
          recipient,
          amount,
          startTime,
          interval,
          totalPayments
        }
      });
    } catch (error) {
      this.logger.error('Failed to schedule payment:', error);
      res.status(500).json({ 
        error: 'Failed to schedule payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async emergencyWithdraw(req: Request, res: Response): Promise<void> {
    try {
      const { project, token, amount, recipient, reason } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.emergencyWithdraw(projectId, token, amount, recipient, reason);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          project,
          token,
          amount,
          recipient,
          reason,
          emergencyType: 'withdrawal'
        }
      });
    } catch (error) {
      this.logger.error('Failed to emergency withdraw:', error);
      res.status(500).json({ 
        error: 'Failed to emergency withdraw',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async addOperator(req: Request, res: Response): Promise<void> {
    try {
      const { project, operator } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.addAuthorizedOperator(projectId, operator);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          project,
          operator
        }
      });
    } catch (error) {
      this.logger.error('Failed to add operator:', error);
      res.status(500).json({ 
        error: 'Failed to add operator',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async removeOperator(req: Request, res: Response): Promise<void> {
    try {
      const { project, operator } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const projectId = this.getProjectId(project);
      if (projectId === -1) {
        res.status(400).json({ error: 'Invalid project name' });
        return;
      }

      const treasury = this.contractRegistry.getContractWithSigner('PitchforksTreasury', signer);
      if (!treasury) {
        res.status(503).json({ error: 'Treasury service unavailable' });
        return;
      }

      const tx = await treasury.removeAuthorizedOperator(projectId, operator);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          project,
          operator
        }
      });
    } catch (error) {
      this.logger.error('Failed to remove operator:', error);
      res.status(500).json({ 
        error: 'Failed to remove operator',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Utility Methods ============

  private getProjectId(project: string): number {
    const projectMap: Record<string, number> = {
      'protocol': 0,
      'dex': 1,
      'ferry': 2,
      'analyst': 3,
      'app': 4
    };

    return projectMap[project.toLowerCase()] || -1;
  }
}
