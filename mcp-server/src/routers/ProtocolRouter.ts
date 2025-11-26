import { Router, Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { Logger } from '../utils/Logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

export class ProtocolRouter {
  private router: Router;
  private contractRegistry: ContractRegistry;
  private logger: Logger;

  constructor(contractRegistry: ContractRegistry) {
    this.router = Router();
    this.contractRegistry = contractRegistry;
    this.logger = new Logger('ProtocolRouter');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public endpoints (read-only)
    this.router.get('/whitepaper', this.getWhitepaper.bind(this));
    this.router.get('/governance/proposals', this.getGovernanceProposals.bind(this));
    this.router.get('/governance/proposals/:id', this.getProposalDetails.bind(this));
    this.router.get('/governance/stats', this.getGovernanceStats.bind(this));
    this.router.get('/stats', this.getProtocolStats.bind(this));
    this.router.get('/token', this.getTokenInfo.bind(this));
    this.router.get('/campaigns', this.getCampaigns.bind(this));
    this.router.get('/campaigns/:id', this.getCampaignDetails.bind(this));

    // Authenticated endpoints (write operations)
    this.router.post('/governance/proposals', 
      authMiddleware, 
      validateRequest(schemas.createProposal), 
      this.createProposal.bind(this)
    );
    
    this.router.post('/governance/proposals/:id/vote', 
      authMiddleware, 
      validateRequest(schemas.castVote), 
      this.voteOnProposal.bind(this)
    );

    this.router.post('/campaigns', 
      authMiddleware, 
      validateRequest(schemas.createCampaign), 
      this.createCampaign.bind(this)
    );

    this.router.post('/campaigns/:id/contribute', 
      authMiddleware, 
      validateRequest(schemas.contribute), 
      this.contributeToCampaign.bind(this)
    );

    this.router.post('/campaigns/:id/withdraw', 
      authMiddleware, 
      this.withdrawCampaignFunds.bind(this)
    );
  }

  public getRouter(): Router {
    return this.router;
  }

  // ============ Public Read Endpoints ============

  private async getWhitepaper(req: Request, res: Response): Promise<void> {
    try {
      // Get whitepaper from IPFS or contract storage
      const protocolAdapter = this.contractRegistry.getContract('ProtocolAdapter');
      
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      // For now, return a placeholder whitepaper
      const whitepaper = {
        title: 'Pitchforks Protocol Whitepaper',
        version: '1.0.0',
        content: 'Decentralized resistance platform powered by Web3 governance...',
        ipfsHash: 'QmPlaceholderHash',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: whitepaper
      });
    } catch (error) {
      this.logger.error('Failed to get whitepaper:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve whitepaper',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getGovernanceProposals(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      const governance = this.contractRegistry.getContract('PitchforksGovernance');
      if (!governance) {
        res.status(503).json({ error: 'Governance service unavailable' });
        return;
      }

      // Get total proposal count
      const totalProposals = await governance.getTotalProposals();
      
      // Fetch proposals with pagination
      const proposals = [];
      const limitNum = Math.min(parseInt(limit as string), 100);
      const offsetNum = Math.max(parseInt(offset as string), 0);
      
      for (let i = offsetNum; i < Math.min(offsetNum + limitNum, totalProposals.toNumber()); i++) {
        try {
          const proposal = await governance.getProposal(i);
          const hasPassed = await governance.hasProposalPassed(i);
          
          proposals.push({
            id: i,
            title: proposal.title,
            description: proposal.description,
            proposer: proposal.proposer,
            startTime: new Date(proposal.startTime.toNumber() * 1000).toISOString(),
            endTime: new Date(proposal.endTime.toNumber() * 1000).toISOString(),
            forVotes: proposal.forVotes.toString(),
            againstVotes: proposal.againstVotes.toString(),
            abstainVotes: proposal.abstainVotes.toString(),
            executed: proposal.executed,
            canceled: proposal.canceled,
            hasPassed,
            targetProject: proposal.targetProject,
            voterCount: proposal.voterCount.toNumber()
          });
        } catch (error) {
          this.logger.warn(`Failed to fetch proposal ${i}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          proposals,
          pagination: {
            total: totalProposals.toNumber(),
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < totalProposals.toNumber()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get governance proposals:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve proposals',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getProposalDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const proposalId = parseInt(id);
      
      if (isNaN(proposalId)) {
        res.status(400).json({ error: 'Invalid proposal ID' });
        return;
      }

      const governance = this.contractRegistry.getContract('PitchforksGovernance');
      if (!governance) {
        res.status(503).json({ error: 'Governance service unavailable' });
        return;
      }

      const proposal = await governance.getProposal(proposalId);
      const hasPassed = await governance.hasProposalPassed(proposalId);
      const canVote = await governance.canVote(proposalId, req.user?.address || '0x0000000000000000000000000000000000000000');

      res.json({
        success: true,
        data: {
          id: proposalId,
          title: proposal.title,
          description: proposal.description,
          proposer: proposal.proposer,
          startTime: new Date(proposal.startTime.toNumber() * 1000).toISOString(),
          endTime: new Date(proposal.endTime.toNumber() * 1000).toISOString(),
          forVotes: proposal.forVotes.toString(),
          againstVotes: proposal.againstVotes.toString(),
          abstainVotes: proposal.abstainVotes.toString(),
          executed: proposal.executed,
          canceled: proposal.canceled,
          hasPassed,
          targetProject: proposal.targetProject,
          voterCount: proposal.voterCount.toNumber(),
          canVote
        }
      });
    } catch (error) {
      this.logger.error('Failed to get proposal details:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve proposal details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getGovernanceStats(req: Request, res: Response): Promise<void> {
    try {
      const governance = this.contractRegistry.getContract('PitchforksGovernance');
      const pforkToken = this.contractRegistry.getContract('PFORKToken');
      
      if (!governance || !pforkToken) {
        res.status(503).json({ error: 'Governance or token service unavailable' });
        return;
      }

      const totalProposals = await governance.getTotalProposals();
      const totalSupply = await pforkToken.totalSupply();
      
      // Calculate active proposals
      let activeProposals = 0;
      let executedProposals = 0;
      
      for (let i = 0; i < Math.min(totalProposals.toNumber(), 100); i++) {
        try {
          const proposal = await governance.getProposal(i);
          if (!proposal.executed && !proposal.canceled) {
            activeProposals++;
          }
          if (proposal.executed) {
            executedProposals++;
          }
        } catch (error) {
          // Skip invalid proposals
        }
      }

      res.json({
        success: true,
        data: {
          totalProposals: totalProposals.toString(),
          activeProposals,
          executedProposals,
          totalSupply: totalSupply.toString(),
          governanceToken: {
            name: 'PFORK',
            symbol: 'PFORK',
            totalSupply: totalSupply.toString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get governance stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve governance statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getProtocolStats(req: Request, res: Response): Promise<void> {
    try {
      const protocolAdapter = this.contractRegistry.getContract('ProtocolAdapter');
      const governance = this.contractRegistry.getContract('PitchforksGovernance');
      
      if (!protocolAdapter || !governance) {
        res.status(503).json({ error: 'Protocol or governance service unavailable' });
        return;
      }

      const stats = await protocolAdapter.getCampaignStats();
      const totalProposals = await governance.getTotalProposals();

      res.json({
        success: true,
        data: {
          campaigns: {
            totalFunds: stats.totalFunds.toString(),
            userCampaignCount: stats.userCampaignCount.toString(),
            isPaused: stats.isPaused,
            authorizedCreatorCount: stats.authorizedCreatorCount.toString()
          },
          governance: {
            totalProposals: totalProposals.toString()
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get protocol stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve protocol statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTokenInfo(req: Request, res: Response): Promise<void> {
    try {
      const pforkToken = this.contractRegistry.getContract('PFORKToken');
      
      if (!pforkToken) {
        res.status(503).json({ error: 'Token service unavailable' });
        return;
      }

      const tokenInfo = await pforkToken.getTokenInfo();
      const userBalance = req.user?.address ? 
        await pforkToken.balanceOf(req.user.address) : 
        '0';

      res.json({
        success: true,
        data: {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          totalSupply: tokenInfo.totalSupply.toString(),
          maxSupply: tokenInfo.maxSupply.toString(),
          remainingMintable: tokenInfo.remainingMintable.toString(),
          owner: tokenInfo.owner,
          userBalance: userBalance.toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get token info:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve token information',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      
      const protocolAdapter = this.contractRegistry.getContract('ProtocolAdapter');
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      // For now, return a simplified campaign list
      // In a full implementation, this would query the funding contract
      const campaigns = [];
      
      res.json({
        success: true,
        data: {
          campaigns,
          pagination: {
            total: 0,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: false
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get campaigns:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getCampaignDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaignId = parseInt(id);
      
      if (isNaN(campaignId)) {
        res.status(400).json({ error: 'Invalid campaign ID' });
        return;
      }

      const protocolAdapter = this.contractRegistry.getContract('ProtocolAdapter');
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      const campaign = await protocolAdapter.getCampaignDetails(campaignId);

      res.json({
        success: true,
        data: {
          id: campaignId,
          title: campaign.title,
          description: campaign.description,
          creator: campaign.creator,
          goalAmount: campaign.goalAmount.toString(),
          raisedAmount: campaign.raisedAmount.toString(),
          deadline: new Date(campaign.deadline.toNumber() * 1000).toISOString(),
          isActive: campaign.isActive,
          goalReached: campaign.goalReached,
          contributorCount: campaign.contributorCount.toNumber()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get campaign details:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve campaign details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Authenticated Write Endpoints ============

  private async createProposal(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, targetProject, actionData } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const governance = this.contractRegistry.getContractWithSigner('PitchforksGovernance', signer);
      if (!governance) {
        res.status(503).json({ error: 'Governance service unavailable' });
        return;
      }

      const tx = await governance.createProposal(
        title,
        description,
        targetProject,
        actionData
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          proposalId: receipt.logs[0]?.args?.proposalId?.toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to create proposal:', error);
      res.status(500).json({ 
        error: 'Failed to create proposal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async voteOnProposal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { support } = req.body;
      const proposalId = parseInt(id);
      
      if (isNaN(proposalId)) {
        res.status(400).json({ error: 'Invalid proposal ID' });
        return;
      }

      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const governance = this.contractRegistry.getContractWithSigner('PitchforksGovernance', signer);
      if (!governance) {
        res.status(503).json({ error: 'Governance service unavailable' });
        return;
      }

      const tx = await governance.vote(proposalId, support);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          voteWeight: receipt.logs[0]?.args?.weight?.toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to vote on proposal:', error);
      res.status(500).json({ 
        error: 'Failed to cast vote',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, goalAmount, durationDays, requiresGovernanceApproval } = req.body;
      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const protocolAdapter = this.contractRegistry.getContractWithSigner('ProtocolAdapter', signer);
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      const tx = await protocolAdapter.createCampaignWithGovernance(
        title,
        description,
        goalAmount,
        durationDays,
        requiresGovernanceApproval
      );

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          campaignId: receipt.logs[0]?.args?.campaignId?.toString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to create campaign:', error);
      res.status(500).json({ 
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async contributeToCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const campaignId = parseInt(id);
      
      if (isNaN(campaignId)) {
        res.status(400).json({ error: 'Invalid campaign ID' });
        return;
      }

      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const protocolAdapter = this.contractRegistry.getContractWithSigner('ProtocolAdapter', signer);
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      const tx = await protocolAdapter.contributeWithGovernance(campaignId, {
        value: amount
      });

      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          contributionAmount: amount
        }
      });
    } catch (error) {
      this.logger.error('Failed to contribute to campaign:', error);
      res.status(500).json({ 
        error: 'Failed to contribute to campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async withdrawCampaignFunds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaignId = parseInt(id);
      
      if (isNaN(campaignId)) {
        res.status(400).json({ error: 'Invalid campaign ID' });
        return;
      }

      const signer = this.contractRegistry.getSigner(req.user.privateKey);
      
      if (!signer) {
        res.status(401).json({ error: 'Invalid signer' });
        return;
      }

      const protocolAdapter = this.contractRegistry.getContractWithSigner('ProtocolAdapter', signer);
      if (!protocolAdapter) {
        res.status(503).json({ error: 'Protocol service unavailable' });
        return;
      }

      const tx = await protocolAdapter.withdrawCampaignFunds(campaignId);
      const receipt = await this.contractRegistry.waitForTransaction(tx.hash);

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error) {
      this.logger.error('Failed to withdraw campaign funds:', error);
      res.status(500).json({ 
        error: 'Failed to withdraw campaign funds',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
