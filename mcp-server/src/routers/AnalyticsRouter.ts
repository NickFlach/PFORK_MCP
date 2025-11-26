import { Router, Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { Logger } from '../utils/Logger';

export class AnalyticsRouter {
  private router: Router;
  private contractRegistry: ContractRegistry;
  private logger: Logger;

  constructor(contractRegistry: ContractRegistry) {
    this.router = Router();
    this.contractRegistry = contractRegistry;
    this.logger = new Logger('AnalyticsRouter');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Ecosystem-wide analytics endpoints
    this.router.get('/dashboard', this.getEcosystemDashboard.bind(this));
    this.router.get('/metrics', this.getEcosystemMetrics.bind(this));
    this.router.get('/trends', this.getTrendsData.bind(this));
    this.router.get('/performance', this.getPerformanceMetrics.bind(this));
    
    // Project-specific analytics
    this.router.get('/protocol', this.getProtocolAnalytics.bind(this));
    this.router.get('/dex', this.getDexAnalytics.bind(this));
    this.router.get('/ferry', this.getFerryAnalytics.bind(this));
    this.router.get('/treasury', this.getTreasuryAnalytics.bind(this));
    
    // Cross-ecosystem analytics
    this.router.get('/correlations', this.getCrossEcosystemCorrelations.bind(this));
    this.router.get('/user-behavior', this.getUserBehaviorAnalytics.bind(this));
    this.router.get('/economic-impact', this.getEconomicImpact.bind(this));
    
    // Real-time analytics
    this.router.get('/real-time', this.getRealTimeMetrics.bind(this));
    this.router.get('/alerts', this.getSystemAlerts.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  // ============ Ecosystem-wide Analytics ============

  private async getEcosystemDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '7d' } = req.query;
      
      // Mock comprehensive dashboard data
      const dashboard = {
        overview: {
          totalValueLocked: '25000000000000000000000', // 25K tokens
          totalVolume24h: '1250000000000000000000', // 1.25K tokens
          activeUsers24h: 1250,
          totalTransactions: 45000,
          governanceParticipation: '67.5', // 67.5% participation rate
          ecosystemHealth: 'healthy',
          lastUpdated: new Date().toISOString()
        },
        projectMetrics: {
          protocol: {
            tvl: '8000000000000000000000', // 8K tokens
            volume24h: '500000000000000000000', // 500 tokens
            activeUsers: 450,
            proposals24h: 3,
            campaignsActive: 12
          },
          dex: {
            tvl: '12000000000000000000000', // 12K tokens
            volume24h: '600000000000000000000', // 600 tokens
            activeUsers: 680,
            pairsActive: 15,
            swaps24h: 2340
          },
          ferry: {
            tvl: '3000000000000000000000', // 3K tokens
            volume24h: '150000000000000000000', // 150 tokens
            activeUsers: 120,
            bridges24h: 45,
            supportedNetworks: 3
          },
          treasury: {
            totalAssets: '25000000000000000000000', // 25K tokens
            allocatedAmount: '20000000000000000000000', // 20K allocated
            utilizationRate: '80.0', // 80% utilization
            activeProjects: 3,
            monthlyBurnRate: '500000000000000000000' // 500 tokens/month
          }
        },
        trends: {
          tvlChange7d: '+15.3%',
          volumeChange7d: '+8.7%',
          userGrowth7d: '+12.1%',
          governanceActivity7d: '+5.2%'
        },
        alerts: [
          {
            type: 'info',
            message: 'New governance proposal requires community attention',
            severity: 'medium',
            timestamp: new Date().toISOString()
          },
          {
            type: 'warning',
            message: 'DEX liquidity pool showing high slippage',
            severity: 'high',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      this.logger.error('Failed to get ecosystem dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve ecosystem dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getEcosystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '24h', granularity = 'hour' } = req.query;
      
      // Mock time-series metrics data
      const metrics = {
        timeframe,
        granularity,
        metrics: {
          tvl: {
            current: '25000000000000000000000',
            change24h: '+5.2%',
            change7d: '+15.3%',
            change30d: '+42.8%',
            data: this.generateTimeSeriesData('tvl', timeframe as string, granularity as string)
          },
          volume: {
            current: '1250000000000000000000',
            change24h: '+8.7%',
            change7d: '+12.4%',
            change30d: '+28.3%',
            data: this.generateTimeSeriesData('volume', timeframe as string, granularity as string)
          },
          users: {
            current: 1250,
            change24h: '+12.1%',
            change7d: '+18.5%',
            change30d: '+45.2%',
            data: this.generateTimeSeriesData('users', timeframe as string, granularity as string)
          },
          transactions: {
            current: 45000,
            change24h: '+6.3%',
            change7d: '+11.2%',
            change30d: '+32.7%',
            data: this.generateTimeSeriesData('transactions', timeframe as string, granularity as string)
          }
        }
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Failed to get ecosystem metrics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve ecosystem metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTrendsData(req: Request, res: Response): Promise<void> {
    try {
      const { category = 'all', period = '30d' } = req.query;
      
      const trends = {
        category,
        period,
        trends: [
          {
            name: 'DeFi Integration',
            trend: 'upward',
            change: '+45.2%',
            confidence: 0.92,
            description: 'Increasing DeFi protocol integration driving ecosystem growth'
          },
          {
            name: 'Cross-Chain Activity',
            trend: 'upward',
            change: '+28.7%',
            confidence: 0.87,
            description: 'Growing cross-chain bridge usage indicating network expansion'
          },
          {
            name: 'Governance Participation',
            trend: 'stable',
            change: '+2.1%',
            confidence: 0.65,
            description: 'Steady governance participation with room for improvement'
          },
          {
            name: 'Liquidity Provision',
            trend: 'upward',
            change: '+67.3%',
            confidence: 0.95,
            description: 'Strong growth in liquidity provision across DEX pools'
          }
        ],
        predictions: [
          {
            metric: 'TVL',
            prediction: '32000000000000000000000',
            timeframe: '90d',
            confidence: 0.78
          },
          {
            metric: 'Daily Volume',
            prediction: '2000000000000000000000',
            timeframe: '90d',
            confidence: 0.72
          }
        ]
      };

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      this.logger.error('Failed to get trends data:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve trends data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const performance = {
        system: {
          averageResponseTime: '245ms',
          uptime: '99.97%',
          errorRate: '0.03%',
          throughput: '1250 req/min',
          peakLoad: '3500 req/min'
        },
        blockchain: {
          averageBlockTime: '12.1s',
          gasEfficiency: '85.2%',
          transactionSuccessRate: '99.8%',
          averageConfirmationTime: '45s'
        },
        contracts: {
          deploymentSuccess: '100%',
          upgradeTime: '2.3 min',
          auditScore: '95/100',
          securityIncidents: 0
        },
        userExperience: {
          averageLoadTime: '1.2s',
          bounceRate: '12.3%',
          userSatisfaction: '4.6/5.0',
          supportTickets: 23
        }
      };

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Project-specific Analytics ============

  private async getProtocolAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = {
        governance: {
          totalProposals: 156,
          activeProposals: 8,
          participationRate: '67.5%',
          averageVotingTime: '4.2 days',
          proposalSuccessRate: '78.3%'
        },
        funding: {
          totalCampaigns: 89,
          activeCampaigns: 12,
          totalRaised: '4500000000000000000000',
          successRate: '82.4%',
          averageContribution: '125000000000000000000'
        },
        community: {
          totalMembers: 5680,
          activeMembers: 1250,
          newMembers30d: 340,
          retentionRate: '87.2%'
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Failed to get protocol analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve protocol analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getDexAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = {
        trading: {
          totalVolume24h: '600000000000000000000',
          totalVolume7d: '4200000000000000000000',
          averageTradeSize: '250000000000000000000',
          trades24h: 2340,
          topPairs: [
            { pair: 'PFORK-ETH', volume: '350000000000000000000', trades: 1450 },
            { pair: 'PFORK-USDC', volume: '200000000000000000000', trades: 780 },
            { pair: 'ETH-USDC', volume: '50000000000000000000', trades: 110 }
          ]
        },
        liquidity: {
          totalLiquidity: '12000000000000000000000',
          activePools: 15,
          averageAPR: '12.5%',
          liquidityProviders: 340
        },
        efficiency: {
          priceImpact: '0.2%',
          slippage: '0.15%',
          gasOptimization: '85.2%',
          mevProtection: 'active'
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Failed to get DEX analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve DEX analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getFerryAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = {
        bridging: {
          totalVolume24h: '150000000000000000000',
          totalBridges24h: 45,
          averageBridgeTime: '15.2 min',
          successRate: '99.8%',
          topRoutes: [
            { from: 'Ethereum', to: 'NEO X', volume: '80000000000000000000', bridges: 25 },
            { from: 'NEO X', to: 'Ethereum', volume: '50000000000000000000', bridges: 15 },
            { from: 'Polygon', to: 'NEO X', volume: '20000000000000000000', bridges: 5 }
          ]
        },
        nfts: {
          totalMinted: 1250,
          minted24h: 12,
          averageMintPrice: '50000000000000000',
          uniqueHolders: 680
        },
        network: {
          supportedNetworks: 3,
          activeRelayers: 8,
          networkHealth: 'optimal',
          latency: '2.3s'
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Failed to get Ferry analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve Ferry analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getTreasuryAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = {
        assets: {
          totalValue: '25000000000000000000000',
          totalAllocated: '20000000000000000000000',
          utilizationRate: '80.0%',
          assetDistribution: {
            pfork: '60.0%',
            eth: '25.0%',
            stablecoins: '15.0%'
          }
        },
        operations: {
          totalWithdrawals: 156,
          totalAllocations: 45,
          averageWithdrawalTime: '2.1 hours',
          emergencyWithdrawals: 2
        },
        sustainability: {
          monthlyBurnRate: '500000000000000000000',
          runway: '24 months',
          revenueGeneration: '250000000000000000000',
          costEfficiency: '92.3%'
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Failed to get treasury analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve treasury analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Cross-ecosystem Analytics ============

  private async getCrossEcosystemCorrelations(req: Request, res: Response): Promise<void> {
    try {
      const correlations = {
        correlations: [
          {
            metric1: 'DEX Volume',
            metric2: 'Bridge Activity',
            correlation: 0.73,
            significance: 'high',
            description: 'Higher DEX trading volume correlates with increased cross-chain bridge usage'
          },
          {
            metric1: 'Governance Participation',
            metric2: 'Protocol Funding',
            correlation: 0.68,
            significance: 'medium',
            description: 'Active governance participants tend to contribute more to funding campaigns'
          },
          {
            metric1: 'Treasury Allocation',
            metric2: 'Project TVL',
            correlation: 0.89,
            significance: 'high',
            description: 'Strong correlation between treasury allocations and project TVL growth'
          }
        ],
        insights: [
          'Cross-chain activity drives overall ecosystem growth',
          'Governance engagement positively impacts funding success',
          'Treasury management effectiveness correlates with project performance'
        ]
      };

      res.json({
        success: true,
        data: correlations
      });
    } catch (error) {
      this.logger.error('Failed to get cross-ecosystem correlations:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve cross-ecosystem correlations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getUserBehaviorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userBehavior = {
        segments: [
          {
            name: 'Power Users',
            size: 125,
            characteristics: ['High governance participation', 'Multiple protocol usage', 'Large liquidity provision'],
            value: '45.2% of total volume'
          },
          {
            name: 'Active Traders',
            size: 340,
            characteristics: ['Frequent DEX usage', 'Bridge utilization', 'NFT collection'],
            value: '32.8% of total volume'
          },
          {
            name: 'Casual Participants',
            size: 785,
            characteristics: ['Occasional voting', 'Small contributions', 'Single protocol usage'],
            value: '22.0% of total volume'
          }
        ],
        flows: [
          {
            path: 'Governance → Funding → DEX',
            frequency: 'high',
            conversion: '67.3%'
          },
          {
            path: 'DEX → Bridge → NFT',
            frequency: 'medium',
            conversion: '34.2%'
          }
        ],
        retention: {
          day1: '85.2%',
          day7: '72.4%',
          day30: '58.7%',
          day90: '43.1%'
        }
      };

      res.json({
        success: true,
        data: userBehavior
      });
    } catch (error) {
      this.logger.error('Failed to get user behavior analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve user behavior analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getEconomicImpact(req: Request, res: Response): Promise<void> {
    try {
      const economicImpact = {
        ecosystemValue: {
          totalValueCreated: '125000000000000000000000', // $125K equivalent
          valueCapture: '68.3%',
          externalValue: '31.7%',
          growthRate: '+45.2% annually'
        },
        sustainability: {
          operationalCosts: '15000000000000000000000', // $15K equivalent
          revenueGeneration: '25000000000000000000000', // $25K equivalent
          profitMargin: '40.0%',
            sustainabilityScore: '8.7/10'
        },
        externalImpact: [
          'Enabled 12 external DeFi protocols',
          'Integrated with 3 major blockchains',
          'Served 5,680 unique users',
          'Processed $2.5M in total volume'
        ]
      };

      res.json({
        success: true,
        data: economicImpact
      });
    } catch (error) {
      this.logger.error('Failed to get economic impact:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve economic impact',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Real-time Analytics ============

  private async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const realTime = {
        timestamp: new Date().toISOString(),
        metrics: {
          activeUsers: 234,
          pendingTransactions: 12,
          currentBlock: 18456789,
          gasPrice: '25000000000',
          networkLoad: '67.3%',
          systemHealth: 'optimal'
        },
        alerts: [
          {
            type: 'performance',
            message: 'High transaction volume detected',
            severity: 'info'
          }
        ]
      };

      res.json({
        success: true,
        data: realTime
      });
    } catch (error) {
      this.logger.error('Failed to get real-time metrics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve real-time metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getSystemAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = [
        {
          id: '1',
          type: 'performance',
          severity: 'medium',
          title: 'Increased Gas Prices',
          message: 'Network gas prices have increased by 25% in the last hour',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          resolved: false
        },
        {
          id: '2',
          type: 'security',
          severity: 'low',
          title: 'Unusual Activity Detected',
          message: 'Unusual trading pattern detected in PFORK-USDC pool',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          resolved: false
        },
        {
          id: '3',
          type: 'maintenance',
          severity: 'info',
          title: 'Scheduled Maintenance',
          message: 'System maintenance scheduled for tomorrow 02:00 UTC',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          resolved: false
        }
      ];

      res.json({
        success: true,
        data: {
          alerts,
          total: alerts.length,
          unresolved: alerts.filter(a => !a.resolved).length
        }
      });
    } catch (error) {
      this.logger.error('Failed to get system alerts:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve system alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============ Utility Methods ============

  private generateTimeSeriesData(metric: string, timeframe: string, granularity: string): Array<{timestamp: string, value: string | number}> {
    const dataPoints = [];
    const now = Date.now();
    let intervals = 24; // Default to 24 hours
    
    if (timeframe === '7d') intervals = 168; // 7 days * 24 hours
    if (timeframe === '30d') intervals = 720; // 30 days * 24 hours
    
    for (let i = intervals - 1; i >= 0; i--) {
      const timestamp = new Date(now - (i * 3600000)).toISOString();
      let value: string | number;
      
      // Generate mock data based on metric type
      switch (metric) {
        case 'tvl':
          value = (20000000000000000000000 + Math.random() * 10000000000000000000000).toString();
          break;
        case 'volume':
          value = (1000000000000000000000 + Math.random() * 500000000000000000000).toString();
          break;
        case 'users':
          value = Math.floor(800 + Math.random() * 700);
          break;
        case 'transactions':
          value = Math.floor(30000 + Math.random() * 20000);
          break;
        default:
          value = '0';
      }
      
      dataPoints.push({ timestamp, value });
    }
    
    return dataPoints;
  }
}
