import { Router, Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { Logger } from '../utils/Logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

export class DexRouter {
  private router: Router;
  private contractRegistry: ContractRegistry;
  private logger: Logger;

  constructor(contractRegistry: ContractRegistry) {
    this.router = Router();
    this.contractRegistry = contractRegistry;
    this.logger = new Logger('DexRouter');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public endpoints (read-only)
    this.router.get('/pairs', this.getTokenPairs.bind(this));
    this.router.get('/price/:token', this.getTokenPrice.bind(this));
    this.router.get('/pools', this.getLiquidityPools.bind(this));
    this.router.get('/pools/:tokenA/:tokenB', this.getPoolInfo.bind(this));
    this.router.get('/swap/quote', this.getSwapQuote.bind(this));
    this.router.get('/stats', this.getDexStats.bind(this));
    this.router.get('/volume', this.getVolumeData.bind(this));

    // Authenticated endpoints (write operations)
    this.router.post('/swap/execute', 
      authMiddleware, 
      validateRequest(schemas.executeSwap), 
      this.executeSwap.bind(this)
    );

    this.router.post('/pools/add', 
      authMiddleware, 
      validateRequest(schemas.addLiquidity), 
      this.addLiquidity.bind(this)
    );

    this.router.post('/pools/remove', 
      authMiddleware, 
      validateRequest(schemas.removeLiquidity), 
      this.removeLiquidity.bind(this)
    );

    this.router.post('/swap/commit', 
      authMiddleware, 
      validateRequest(schemas.commitSwap), 
      this.commitSwap.bind(this)
    );

    this.router.post('/swap/reveal', 
      authMiddleware, 
      validateRequest(schemas.revealSwap), 
      this.revealSwap.bind(this)
    );
  }

  public getRouter(): Router {
    return this.router;
  }

  // ============ Public Read Endpoints ============

  private async getTokenPairs(req: Request, res: Response): Promise<void> {
    try {
      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const supportedTokens = await dexAdapter.getSupportedTokens();
      
      // Generate trading pairs from supported tokens
      const pairs = [];
      for (let i = 0; i < supportedTokens.length; i++) {
        for (let j = i + 1; j < supportedTokens.length; j++) {
          pairs.push({
            tokenA: supportedTokens[i],
            tokenB: supportedTokens[j],
            pairAddress: this.generatePairAddress(supportedTokens[i], supportedTokens[j])
          });
        }
      }

      res.json({
        success: true,
        data: {
          pairs,
          supportedTokens,
          totalPairs: pairs.length
        }
      });
    } catch (error) {
      this.logger.error('Failed to get token pairs:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve token pairs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTokenPrice(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { baseToken = '0x0000000000000000000000000000000000000000' } = req.query; // ETH as default
      
      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      // Get price from liquidity pool
      const price = await dexAdapter.getTokenPrice(token, baseToken);
      
      res.json({
        success: true,
        data: {
          token,
          baseToken,
          price: price.toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get token price:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve token price',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getLiquidityPools(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const supportedTokens = await dexAdapter.getSupportedTokens();
      const pools = [];
      
      // Get pool info for each pair
      for (let i = 0; i < Math.min(supportedTokens.length, 10); i++) {
        for (let j = i + 1; j < Math.min(supportedTokens.length, 10); j++) {
          try {
            const poolInfo = await dexAdapter.getPoolInfo(supportedTokens[i], supportedTokens[j]);
            
            if (poolInfo.isActive) {
              pools.push({
                tokenA: poolInfo.tokenA,
                tokenB: poolInfo.tokenB,
                totalLiquidity: poolInfo.totalLiquidity.toString(),
                apr: poolInfo.apr.toString(),
                lastUpdate: new Date(poolInfo.lastUpdate.toNumber() * 1000).toISOString()
              });
            }
          } catch (error) {
            // Skip invalid pools
          }
        }
      }

      // Sort by liquidity
      pools.sort((a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity));

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedPools = pools.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          pools: paginatedPools,
          pagination: {
            total: pools.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < pools.length
          },
          totalTvl: pools.reduce((sum, pool) => sum + parseFloat(pool.totalLiquidity), 0).toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get liquidity pools:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve liquidity pools',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getPoolInfo(req: Request, res: Response): Promise<void> {
    try {
      const { tokenA, tokenB } = req.params;
      
      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const poolInfo = await dexAdapter.getPoolInfo(tokenA, tokenB);
      
      res.json({
        success: true,
        data: {
          tokenA: poolInfo.tokenA,
          tokenB: poolInfo.tokenB,
          totalLiquidity: poolInfo.totalLiquidity.toString(),
          apr: poolInfo.apr.toString(),
          isActive: poolInfo.isActive,
          lastUpdate: new Date(poolInfo.lastUpdate.toNumber() * 1000).toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get pool info:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve pool information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getSwapQuote(req: Request, res: Response): Promise<void> {
    try {
      const { tokenIn, tokenOut, amountIn, slippageTolerance = 500 } = req.query;
      
      if (!tokenIn || !tokenOut || !amountIn) {
        res.status(400).json({ error: 'Missing required parameters: tokenIn, tokenOut, amountIn' });
        return;
      }

      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const quote = await dexAdapter.getSwapQuote(tokenIn as string, tokenOut as string, amountIn as string);
      
      const minAmountOut = (BigInt(quote.amountOut) * BigInt(10000 - parseInt(slippageTolerance as string))) / BigInt(10000);
      
      res.json({
        success: true,
        data: {
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: quote.amountOut.toString(),
          minAmountOut: minAmountOut.toString(),
          priceImpact: quote.priceImpact?.toString() || '0',
          gasEstimate: quote.gasEstimate?.toString() || '100000',
          slippageTolerance: slippageTolerance.toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get swap quote:', error);
      res.status(500).json({ 
        error: 'Failed to calculate swap quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getDexStats(req: Request, res: Response): Promise<void> {
    try {
      const dexAdapter = this.contractRegistry.getContract('DexAdapter');
      
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const stats = await dexAdapter.getDexStats();
      const supportedTokens = await dexAdapter.getSupportedTokens();
      
      res.json({
        success: true,
        data: {
          totalVolume: stats.totalVolume.toString(),
          supportedTokenCount: supportedTokens.length,
          isPaused: stats.isPaused,
          authorizedProviderCount: stats.authorizedProviderCount.toString(),
          supportedTokens,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get DEX stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve DEX statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getVolumeData(req: Request, res: Response): Promise<void> {
    try {
      const { period = '24h', tokenPair } = req.query;
      
      // Mock volume data - in production, this would come from event indexing
      const volumeData = {
        period,
        volume24h: '1250000000000000000000', // 1250 tokens
        volume7d: '8750000000000000000000',  // 8750 tokens
        volume30d: '35000000000000000000000', // 35000 tokens
        topPairs: [
          { pair: 'PFORK-ETH', volume: '750000000000000000000' },
          { pair: 'PFORK-USDC', volume: '500000000000000000000' }
        ],
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: volumeData
      });
    } catch (error) {
      this.logger.error('Failed to get volume data:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve volume data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Authenticated Write Endpoints ============

  private async executeSwap(req: Request, res: Response): Promise<void> {
    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin, deadline } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const dexAdapter = this.contractRegistry.getContractWithSigner('DexAdapter', signer);
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const tx = await dexAdapter.swapWithGovernance(
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        deadline
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      // Extract swap amount from logs
      const swapAmount = receipt.logs[0]?.args?.amountOut?.toString() || '0';

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          amountOut: swapAmount
        }
      });
    } catch (error) {
      this.logger.error('Failed to execute swap:', error);
      res.status(500).json({ 
        error: 'Failed to execute swap',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async addLiquidity(req: Request, res: Response): Promise<void> {
    try {
      const { tokenA, tokenB, amountA, amountB, minAmountA, minAmountB } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const dexAdapter = this.contractRegistry.getContractWithSigner('DexAdapter', signer);
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const tx = await dexAdapter.addLiquidityWithGovernance(
        tokenA,
        tokenB,
        amountA,
        amountB,
        minAmountA,
        minAmountB
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      // Extract liquidity amount from logs
      const liquidity = receipt.logs[0]?.args?.liquidity?.toString() || '0';

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          liquidity
        }
      });
    } catch (error) {
      this.logger.error('Failed to add liquidity:', error);
      res.status(500).json({ 
        error: 'Failed to add liquidity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async removeLiquidity(req: Request, res: Response): Promise<void> {
    try {
      const { tokenA, tokenB, liquidity, minAmountA, minAmountB } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const dexAdapter = this.contractRegistry.getContractWithSigner('DexAdapter', signer);
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const tx = await dexAdapter.removeLiquidityWithGovernance(
        tokenA,
        tokenB,
        liquidity,
        minAmountA,
        minAmountB
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error) {
      this.logger.error('Failed to remove liquidity:', error);
      res.status(500).json({ 
        error: 'Failed to remove liquidity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async commitSwap(req: Request, res: Response): Promise<void> {
    try {
      const { commitment, expiresAt } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const protectedRouter = this.contractRegistry.getContractWithSigner('ProtectedRouter', signer);
      if (!protectedRouter) {
        res.status(503).json({ error: 'Protected router service unavailable' });
        return;
      }

      const tx = await protectedRouter.commitSwap(commitment, expiresAt);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          commitHash: commitment
        }
      });
    } catch (error) {
      this.logger.error('Failed to commit swap:', error);
      res.status(500).json({ 
        error: 'Failed to commit swap',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async revealSwap(req: Request, res: Response): Promise<void> {
    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin, deadline, salt } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const dexAdapter = this.contractRegistry.getContractWithSigner('DexAdapter', signer);
      if (!dexAdapter) {
        res.status(503).json({ error: 'DEX service unavailable' });
        return;
      }

      const tx = await dexAdapter.commitRevealSwap(
        ethers.keccak256(ethers.toUtf8Bytes('commitment')), // Mock commitment
        Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        deadline,
        salt
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error) {
      this.logger.error('Failed to reveal swap:', error);
      res.status(500).json({ 
        error: 'Failed to reveal swap',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Utility Methods ============

  private generatePairAddress(tokenA: string, tokenB: string): string {
    // Generate a deterministic pair address for display purposes
    const sortedTokens = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort();
    return `0x${ethers.keccak256(ethers.solidityPacked(['address', 'address'], sortedTokens)).slice(2, 42)}`;
  }
}
