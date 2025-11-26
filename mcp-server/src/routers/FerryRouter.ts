import { Router, Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { Logger } from '../utils/Logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

export class FerryRouter {
  private router: Router;
  private contractRegistry: ContractRegistry;
  private logger: Logger;

  constructor(contractRegistry: ContractRegistry) {
    this.router = Router();
    this.contractRegistry = contractRegistry;
    this.logger = new Logger('FerryRouter');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public endpoints (read-only)
    this.router.get('/bridge/status', this.getBridgeStatus.bind(this));
    this.router.get('/bridge/tokens', this.getSupportedTokens.bind(this));
    this.router.get('/bridge/quote', this.getBridgeQuote.bind(this));
    this.router.get('/bridge/history/:address', this.getBridgeHistory.bind(this));
    this.router.get('/bridge/stats', this.getBridgeStats.bind(this));
    this.router.get('/nft/collection', this.getNFTCollection.bind(this));
    this.router.get('/nft/:tokenId', this.getNFTDetails.bind(this));

    // Authenticated endpoints (write operations)
    this.router.post('/bridge/initiate', 
      authMiddleware, 
      validateRequest(schemas.initiateBridge), 
      this.initiateBridge.bind(this)
    );

    this.router.post('/bridge/fulfill', 
      authMiddleware, 
      validateRequest(schemas.fulfillBridge), 
      this.fulfillBridge.bind(this)
    );

    this.router.post('/nft/mint', 
      authMiddleware, 
      validateRequest(schemas.mintNFT), 
      this.mintBridgeNFT.bind(this)
    );

    this.router.post('/bridge/estimate', 
      authMiddleware, 
      this.estimateBridgeFee.bind(this)
    );
  }

  public getRouter(): Router {
    return this.router;
  }

  // ============ Public Read Endpoints ============

  private async getBridgeStatus(req: Request, res: Response): Promise<void> {
    try {
      const ferryAdapter = this.contractRegistry.getContract('FerryAdapter');
      
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      const stats = await ferryAdapter.getBridgeStats();
      const config = await ferryAdapter.getAdapterConfig();
      
      res.json({
        success: true,
        data: {
          isOperational: !stats.isPaused,
          totalVolume: stats.totalVolume.toString(),
          userBridgeCount: stats.userBridgeCount.toString(),
          isPaused: stats.isPaused,
          relayerCount: stats.relayerCount.toString(),
          config: {
            governanceContract: config.governanceContract,
            treasuryContract: config.treasuryContract,
            ferryContract: config.ferryContract,
            pforkToken: config.pforkToken,
            governanceThreshold: config.governanceThreshold.toString(),
            nftGovernanceThreshold: config.nftGovernanceThreshold.toString()
          },
          supportedNetworks: [
            { chainId: 1, name: 'Ethereum', rpcUrl: 'https://mainnet.infura.io/v3/...' },
            { chainId: 47763, name: 'NEO X', rpcUrl: 'https://mainnet-2.rpc.banelabs.org' },
            { chainId: 137, name: 'Polygon', rpcUrl: 'https://polygon-rpc.com' }
          ],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get bridge status:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve bridge status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getSupportedTokens(req: Request, res: Response): Promise<void> {
    try {
      const ferryAdapter = this.contractRegistry.getContract('FerryAdapter');
      
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      // Mock supported tokens - in production, this would come from the contract
      const supportedTokens = [
        {
          address: '0x536d98Ad83F7d0230B9384e606208802ECD728FE',
          symbol: 'PFORK',
          name: 'Pitchforks Token',
          decimals: 18,
          logoURI: 'https://example.com/pfork-logo.png',
          isActive: true
        },
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoURI: 'https://example.com/eth-logo.png',
          isActive: true
        },
        {
          address: '0xA0b86a33E6417c5c8c5c4c8c8c8c8c8c8c8c8c8c',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          logoURI: 'https://example.com/usdc-logo.png',
          isActive: true
        }
      ];

      res.json({
        success: true,
        data: {
          tokens: supportedTokens,
          totalTokens: supportedTokens.length,
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

  private async getBridgeQuote(req: Request, res: Response): Promise<void> {
    try {
      const { token, amount, fromChain, toChain } = req.query;
      
      if (!token || !amount || !fromChain || !toChain) {
        res.status(400).json({ error: 'Missing required parameters: token, amount, fromChain, toChain' });
        return;
      }

      const ferryAdapter = this.contractRegistry.getContract('FerryAdapter');
      
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      // Calculate bridge fee and estimated time
      const nativeFee = await ferryAdapter.nativeFeeWei();
      const feeBps = await ferryAdapter.feeBps();
      const bridgeFee = (BigInt(amount) * BigInt(feeBps)) / BigInt(10000);
      
      const estimatedTime = this.getEstimatedBridgeTime(parseInt(fromChain as string), parseInt(toChain as string));
      
      res.json({
        success: true,
        data: {
          token,
          amount: amount.toString(),
          fromChain: parseInt(fromChain as string),
          toChain: parseInt(toChain as string),
          bridgeFee: bridgeFee.toString(),
          nativeFee: nativeFee.toString(),
          feePercentage: (feeBps / 100).toString(),
          estimatedTimeMinutes: estimatedTime,
          requiresGovernance: BigInt(amount) > await ferryAdapter.getGovernanceThreshold(),
          maxSlippage: '100', // 1%
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get bridge quote:', error);
      res.status(500).json({ 
        error: 'Failed to calculate bridge quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getBridgeHistory(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { limit = 50, offset = 0, status } = req.query;
      
      if (!address || !this.isValidAddress(address as string)) {
        res.status(400).json({ error: 'Invalid address' });
        return;
      }

      // Mock bridge history - in production, this would come from event indexing
      const bridgeHistory = [
        {
          id: '1',
          fromChain: 1,
          toChain: 47763,
          token: '0x536d98Ad83F7d0230B9384e606208802ECD728FE',
          amount: '100000000000000000000',
          status: 'completed',
          timestamp: '2024-01-15T10:30:00Z',
          txHash: '0x1234...5678',
          bridgeFee: '1000000000000000'
        },
        {
          id: '2',
          fromChain: 47763,
          toChain: 1,
          token: '0x0000000000000000000000000000000000000000',
          amount: '500000000000000000',
          status: 'pending',
          timestamp: '2024-01-16T14:20:00Z',
          txHash: '0xabcd...efgh',
          bridgeFee: '500000000000000'
        }
      ];

      // Filter by status if provided
      const filteredHistory = status ? 
        bridgeHistory.filter(tx => tx.status === status) : 
        bridgeHistory;

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedHistory = filteredHistory.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          transactions: paginatedHistory,
          pagination: {
            total: filteredHistory.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < filteredHistory.length
          },
          totalVolume: bridgeHistory.reduce((sum, tx) => sum + parseFloat(tx.amount), 0).toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get bridge history:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve bridge history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getBridgeStats(req: Request, res: Response): Promise<void> {
    try {
      const ferryAdapter = this.contractRegistry.getContract('FerryAdapter');
      
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      const stats = await ferryAdapter.getBridgeStats();
      
      // Mock additional statistics
      const additionalStats = {
        totalBridges24h: '125',
        totalVolume24h: '2500000000000000000000',
        averageBridgeTime: '15',
        successRate: '99.5',
        topTokens: [
          { symbol: 'PFORK', volume: '1500000000000000000000', bridges: 75 },
          { symbol: 'ETH', volume: '750000000000000000000', bridges: 35 },
          { symbol: 'USDC', volume: '250000000000000000000', bridges: 15 }
        ],
        topNetworks: [
          { chainId: 1, name: 'Ethereum', volume: '1250000000000000000000', bridges: 60 },
          { chainId: 47763, name: 'NEO X', volume: '1000000000000000000000', bridges: 50 },
          { chainId: 137, name: 'Polygon', volume: '250000000000000000000', bridges: 15 }
        ]
      };

      res.json({
        success: true,
        data: {
          ...stats,
          ...additionalStats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get bridge stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve bridge statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getNFTCollection(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      // Mock NFT collection - in production, this would come from the NFT contract
      const nftCollection = [
        {
          tokenId: '1',
          name: 'Quantum Bridge #1',
          description: 'First bridge across the quantum divide',
          image: 'https://example.com/nft/1.png',
          bridgeId: '0x1234...5678',
          mintedAt: '2024-01-15T10:30:00Z',
          owner: '0x742d...896f'
        },
        {
          tokenId: '2',
          name: 'Cross-Chain Pioneer #2',
          description: 'Pioneering the future of cross-chain interoperability',
          image: 'https://example.com/nft/2.png',
          bridgeId: '0xabcd...efgh',
          mintedAt: '2024-01-16T14:20:00Z',
          owner: '0x8f3a...2b1c'
        }
      ];

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedCollection = nftCollection.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          nfts: paginatedCollection,
          pagination: {
            total: nftCollection.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < nftCollection.length
          },
          totalSupply: nftCollection.length.toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get NFT collection:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve NFT collection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getNFTDetails(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;
      
      // Mock NFT details
      const nftDetails = {
        tokenId,
        name: `Quantum Bridge #${tokenId}`,
        description: 'A commemorative NFT celebrating cross-chain bridge achievements',
        image: `https://example.com/nft/${tokenId}.png`,
        attributes: [
          { trait_type: 'Bridge Type', value: 'Quantum' },
          { trait_type: 'Network', value: 'NEO X' },
          { trait_type: 'Rarity', value: 'Legendary' },
          { trait_type: 'Mint Date', value: '2024-01-15' }
        ],
        bridgeId: '0x1234...5678',
        mintedAt: '2024-01-15T10:30:00Z',
        owner: '0x742d...896f',
        creator: '0x0000000000000000000000000000000000000000',
        contractAddress: '0x9876...5432'
      };

      res.json({
        success: true,
        data: nftDetails
      });
    } catch (error) {
      this.logger.error('Failed to get NFT details:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve NFT details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Authenticated Write Endpoints ============

  private async initiateBridge(req: Request, res: Response): Promise<void> {
    try {
      const { token, amount, to, chainId, requiresGovernanceApproval } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const ferryAdapter = this.contractRegistry.getContractWithSigner('FerryAdapter', signer);
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      // Calculate native fee
      const nativeFee = await ferryAdapter.nativeFeeWei();
      
      const tx = await ferryAdapter.bridgeOutWithGovernance(
        token,
        amount,
        to,
        chainId,
        requiresGovernanceApproval || false,
        {
          value: nativeFee
        }
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          bridgeId: receipt.logs[0]?.args?.bridgeId?.toString(),
          status: 'initiated',
          estimatedTimeMinutes: this.getEstimatedBridgeTime(47763, chainId)
        }
      });
    } catch (error) {
      this.logger.error('Failed to initiate bridge:', error);
      res.status(500).json({ 
        error: 'Failed to initiate bridge',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async fulfillBridge(req: Request, res: Response): Promise<void> {
    try {
      const { token, amount, to, messageId } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const ferryAdapter = this.contractRegistry.getContractWithSigner('FerryAdapter', signer);
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      const tx = await ferryAdapter.fulfillBridgeIn(token, amount, to, messageId);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          messageId,
          status: 'completed'
        }
      });
    } catch (error) {
      this.logger.error('Failed to fulfill bridge:', error);
      res.status(500).json({ 
        error: 'Failed to fulfill bridge',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async mintBridgeNFT(req: Request, res: Response): Promise<void> {
    try {
      const { recipient, tokenURI, signature } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const ferryAdapter = this.contractRegistry.getContractWithSigner('FerryAdapter', signer);
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      // Calculate mint fee
      const mintFee = await ferryAdapter.mintFeeWei();
      
      const tx = await ferryAdapter.mintBridgeNFT(recipient, tokenURI, signature, {
        value: mintFee
      });

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          tokenId: receipt.logs[0]?.args?.tokenId?.toString(),
          recipient,
          tokenURI
        }
      });
    } catch (error) {
      this.logger.error('Failed to mint bridge NFT:', error);
      res.status(500).json({ 
        error: 'Failed to mint bridge NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async estimateBridgeFee(req: Request, res: Response): Promise<void> {
    try {
      const { token, amount, fromChain, toChain } = req.body;
      
      const ferryAdapter = this.contractRegistry.getContract('FerryAdapter');
      
      if (!ferryAdapter) {
        res.status(503).json({ error: 'Ferry service unavailable' });
        return;
      }

      const nativeFee = await ferryAdapter.nativeFeeWei();
      const feeBps = await ferryAdapter.feeBps();
      const bridgeFee = (BigInt(amount) * BigInt(feeBps)) / BigInt(10000);
      
      res.json({
        success: true,
        data: {
          nativeFee: nativeFee.toString(),
          bridgeFee: bridgeFee.toString(),
          totalFee: (BigInt(nativeFee) + bridgeFee).toString(),
          feeBreakdown: {
            protocolFee: bridgeFee.toString(),
            networkFee: nativeFee.toString(),
            percentage: (feeBps / 100).toString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to estimate bridge fee:', error);
      res.status(500).json({ 
        error: 'Failed to estimate bridge fee',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Utility Methods ============

  private getEstimatedBridgeTime(fromChain: number, toChain: number): number {
    // Estimate bridge time in minutes based on network pairs
    const timeMap: Record<string, number> = {
      '1-47763': 15,  // Ethereum to NEO X
      '47763-1': 20,  // NEO X to Ethereum
      '1-137': 10,    // Ethereum to Polygon
      '137-1': 12,    // Polygon to Ethereum
      '47763-137': 25, // NEO X to Polygon
      '137-47763': 30  // Polygon to NEO X
    };

    const key = `${fromChain}-${toChain}`;
    return timeMap[key] || 20; // Default 20 minutes
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
