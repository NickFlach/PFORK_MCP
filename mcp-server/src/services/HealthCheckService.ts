import { Request, Response } from 'express';
import { ContractRegistry } from '../services/ContractRegistry';
import { CacheService } from '../services/CacheService';
import { TransactionQueueService } from '../services/TransactionQueueService';
import { EventStreamingService } from '../services/EventStreamingService';
import { RateLimitService } from '../services/RateLimitService';
import { ApiKeyService } from '../services/ApiKeyService';
import { Logger } from '../utils/Logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    contractRegistry: ServiceHealth;
    cache: ServiceHealth;
    transactionQueue: ServiceHealth;
    eventStreaming: ServiceHealth;
    rateLimiting: ServiceHealth;
    apiKeyService: ServiceHealth;
  };
  contracts: ContractHealth[];
  metrics: SystemMetrics;
  alerts: HealthAlert[];
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: any;
  error?: string;
}

interface ContractHealth {
  name: string;
  address: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  blockNumber?: number;
  contractInfo?: any;
  error?: string;
}

interface SystemMetrics {
  activeConnections: number;
  requestsPerMinute: number;
  memoryUsage: number;
  cpuUsage: number;
  queueSize: number;
  cacheHitRate: number;
}

interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  service?: string;
}

export class HealthCheckService {
  private contractRegistry: ContractRegistry;
  private cache: CacheService;
  private transactionQueue: TransactionQueueService;
  private eventStreaming: EventStreamingService;
  private rateLimitService: RateLimitService;
  private apiKeyService: ApiKeyService;
  private logger: Logger;
  private startTime: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    contractRegistry: ContractRegistry,
    cache: CacheService,
    transactionQueue: TransactionQueueService,
    eventStreaming: EventStreamingService,
    rateLimitService: RateLimitService,
    apiKeyService: ApiKeyService
  ) {
    this.contractRegistry = contractRegistry;
    this.cache = cache;
    this.transactionQueue = transactionQueue;
    this.eventStreaming = eventStreaming;
    this.rateLimitService = rateLimitService;
    this.apiKeyService = apiKeyService;
    this.logger = new Logger('HealthCheckService');
    this.startTime = Date.now();
  }

  public startPeriodicHealthChecks(): void {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Periodic health check failed:', error);
      }
    }, interval);

    this.logger.info('Periodic health checks started', { interval });
  }

  public stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info('Periodic health checks stopped');
    }
  }

  public async getHealthCheck(): Promise<HealthCheckResult> {
    try {
      const [
        contractRegistryHealth,
        cacheHealth,
        transactionQueueHealth,
        eventStreamingHealth,
        rateLimitHealth,
        apiKeyHealth,
        contractHealths,
        metrics,
        alerts
      ] = await Promise.all([
        this.checkContractRegistry(),
        this.checkCache(),
        this.checkTransactionQueue(),
        this.checkEventStreaming(),
        this.checkRateLimiting(),
        this.checkApiKeyService(),
        this.checkAllContracts(),
        this.getSystemMetrics(),
        this.getHealthAlerts()
      ]);

      const overallStatus = this.calculateOverallStatus([
        contractRegistryHealth,
        cacheHealth,
        transactionQueueHealth,
        eventStreamingHealth,
        rateLimitHealth,
        apiKeyHealth
      ]);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          contractRegistry: contractRegistryHealth,
          cache: cacheHealth,
          transactionQueue: transactionQueueHealth,
          eventStreaming: eventStreamingHealth,
          rateLimiting: rateLimitHealth,
          apiKeyService: apiKeyHealth
        },
        contracts: contractHealths,
        metrics,
        alerts
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          contractRegistry: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message },
          cache: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message },
          transactionQueue: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message },
          eventStreaming: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message },
          rateLimiting: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message },
          apiKeyService: { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString(), error: (error as Error).message }
        },
        contracts: [],
        metrics: { activeConnections: 0, requestsPerMinute: 0, memoryUsage: 0, cpuUsage: 0, queueSize: 0, cacheHitRate: 0 },
        alerts: [{
          severity: 'critical',
          message: 'Health check system failed',
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private async checkContractRegistry(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const systemStatus = await this.contractRegistry.getSystemStatus();
      const responseTime = Date.now() - startTime;

      const status = systemStatus.providerStatus === 'healthy' && systemStatus.contractCount > 0 ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: systemStatus
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkCache(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const cacheStats = this.cache.getCacheStats();
      const testKey = `health_check_${Date.now()}`;
      
      // Test cache write/read
      await this.cache.set(testKey, 'test', 10);
      const testValue = await this.cache.get(testKey);
      await this.cache.del(testKey);
      
      const responseTime = Date.now() - startTime;
      const status = testValue === 'test' && (cacheStats.isConnected || cacheStats.memoryCacheSize > 0) ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: cacheStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkTransactionQueue(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const queueStats = await this.transactionQueue.getQueueStats();
      const responseTime = Date.now() - startTime;
      
      const status = queueStats.failedTransactions < queueStats.totalTransactions * 0.1 ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: queueStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkEventStreaming(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const streamStats = this.eventStreaming.getSubscriptionStats();
      const responseTime = Date.now() - startTime;
      
      const status = streamStats.isRunning ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: streamStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRateLimiting(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const rateLimitStats = await this.rateLimitService.getRateLimitStats();
      const responseTime = Date.now() - startTime;
      
      const status = rateLimitStats.totalActiveLimits > 0 ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: rateLimitStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkApiKeyService(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const apiKeyStats = await this.apiKeyService.getApiKeyStats();
      const responseTime = Date.now() - startTime;
      
      const status = apiKeyStats.totalKeys > 0 ? 'healthy' : 'degraded';

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: apiKeyStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkAllContracts(): Promise<ContractHealth[]> {
    const contractNames = ['PFORKToken', 'PitchforksGovernance', 'PitchforksTreasury', 'ProtocolAdapter', 'DexAdapter', 'FerryAdapter'];
    const contractHealths: ContractHealth[] = [];

    for (const contractName of contractNames) {
      const health = await this.checkContract(contractName);
      contractHealths.push(health);
    }

    return contractHealths;
  }

  private async checkContract(contractName: string): Promise<ContractHealth> {
    const startTime = Date.now();
    
    try {
      const contractInfo = await this.contractRegistry.getContractInfo(contractName);
      const responseTime = Date.now() - startTime;
      
      if (!contractInfo) {
        return {
          name: contractName,
          address: 'unknown',
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: 'Contract not found'
        };
      }

      const status = contractInfo.deployed ? 'healthy' : 'unhealthy';

      return {
        name: contractName,
        address: contractInfo.address,
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        contractInfo
      };
    } catch (error) {
      return {
        name: contractName,
        address: 'unknown',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Get metrics from various services
      const queueStats = await this.transactionQueue.getQueueStats();
      const cacheStats = this.cache.getCacheStats();
      
      return {
        activeConnections: 0, // Would track WebSocket connections
        requestsPerMinute: 0, // Would track from rate limiting service
        memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
        queueSize: queueStats.totalTransactions,
        cacheHitRate: cacheStats.memoryCacheSize > 0 ? 85.5 : 0 // Mock hit rate
      };
    } catch (error: unknown) {
      this.logger.error('Failed to get system metrics:', error);
      return {
        activeConnections: 0,
        requestsPerMinute: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        queueSize: 0,
        cacheHitRate: 0
      };
    }
  }

  private async getHealthAlerts(): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];
    
    try {
      // Check for common issues
      const metrics = await this.getSystemMetrics();
      
      if (metrics.memoryUsage > 500) { // 500MB threshold
        alerts.push({
          severity: 'warning',
          message: 'High memory usage detected',
          timestamp: new Date().toISOString(),
          service: 'system'
        });
      }
      
      if (metrics.queueSize > 100) {
        alerts.push({
          severity: 'warning',
          message: 'Transaction queue is getting large',
          timestamp: new Date().toISOString(),
          service: 'transactionQueue'
        });
      }
      
      if (metrics.cacheHitRate < 70) {
        alerts.push({
          severity: 'info',
          message: 'Cache hit rate is below optimal',
          timestamp: new Date().toISOString(),
          service: 'cache'
        });
      }
      
    } catch (error: unknown) {
      this.logger.error('Failed to generate health alerts:', error);
      alerts.push({
        severity: 'critical',
        message: 'Failed to generate health alerts',
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  private calculateOverallStatus(serviceHealths: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const healthyCount = serviceHealths.filter(s => s.status === 'healthy').length;
    const unhealthyCount = serviceHealths.filter(s => s.status === 'unhealthy').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    }
    
    if (healthyCount === serviceHealths.length) {
      return 'healthy';
    }
    
    return 'degraded';
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const healthCheck = await this.getHealthCheck();
      
      // Cache the result for monitoring
      await this.cache.set('last_health_check', healthCheck, 300);
      
      // Log significant status changes
      if (healthCheck.status === 'unhealthy') {
        this.logger.error('System health check failed', { status: healthCheck.status, alerts: healthCheck.alerts });
      } else if (healthCheck.status === 'degraded') {
        this.logger.warn('System health degraded', { status: healthCheck.status, alerts: healthCheck.alerts });
      }
      
    } catch (error: unknown) {
      this.logger.error('Periodic health check execution failed:', error);
    }
  }

  // Health check endpoints
  public createHealthCheckRoutes() {
    return {
      // Basic health check
      '/health': async (req: Request, res: Response) => {
        try {
          const health = await this.getHealthCheck();
          const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
          res.status(statusCode).json(health);
        } catch (error: unknown) {
          res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
      
      // Readiness probe
      '/health/ready': async (req: Request, res: Response) => {
        try {
          const health = await this.getHealthCheck();
          const isReady = health.status !== 'unhealthy';
          res.status(isReady ? 200 : 503).json({
            ready: isReady,
            status: health.status,
            timestamp: health.timestamp
          });
        } catch (error) {
          res.status(503).json({ ready: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      },
      
      // Liveness probe
      '/health/live': async (req: Request, res: Response) => {
        res.status(200).json({
          alive: true,
          uptime: Date.now() - this.startTime,
          timestamp: new Date().toISOString()
        });
      },
      
      // Detailed service health
      '/health/services': async (req: Request, res: Response) => {
        try {
          const health = await this.getHealthCheck();
          res.json({
            services: health.services,
            timestamp: health.timestamp
          });
        } catch (error) {
          res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      },
      
      // Contract health
      '/health/contracts': async (req: Request, res: Response) => {
        try {
          const health = await this.getHealthCheck();
          res.json({
            contracts: health.contracts,
            timestamp: health.timestamp
          });
        } catch (error) {
          res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    };
  }
}
