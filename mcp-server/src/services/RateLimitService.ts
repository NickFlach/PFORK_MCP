import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { CacheService } from '../services/CacheService';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface PerEndpointLimits {
  public: RateLimitConfig;
  authenticated: RateLimitConfig;
  governance: RateLimitConfig;
  treasury: RateLimitConfig;
  trading: RateLimitConfig;
  analytics: RateLimitConfig;
}

export class RateLimitService {
  private cache: CacheService;
  private logger: Logger;

  constructor(cache: CacheService) {
    this.cache = cache;
    this.logger = new Logger('RateLimitService');
  }

  // Per-endpoint rate limit configurations
  private getEndpointLimits(): PerEndpointLimits {
    return {
      public: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute
        message: 'Too many public requests, please try again later'
      },
      authenticated: {
        windowMs: 60 * 1000, // 1 minute
        max: 1000, // 1000 requests per minute for authenticated users
        message: 'Too many authenticated requests, please try again later'
      },
      governance: {
        windowMs: 60 * 1000, // 1 minute
        max: 5, // 5 governance writes per minute
        message: 'Too many governance actions, please wait before creating more proposals or votes'
      },
      treasury: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 treasury operations per minute
        message: 'Too many treasury operations, please wait before making more withdrawals or allocations'
      },
      trading: {
        windowMs: 60 * 1000, // 1 minute
        max: 20, // 20 trading operations per minute
        message: 'Too many trading operations, please wait before making more swaps or liquidity changes'
      },
      analytics: {
        windowMs: 60 * 1000, // 1 minute
        max: 50, // 50 analytics requests per minute
        message: 'Too many analytics requests, please try again later'
      }
    };
  }

  // Create rate limiters for different endpoint types
  public createPublicLimiter() {
    const config = this.getEndpointLimits().public;
    return this.createEnhancedLimiter(config, 'public');
  }

  public createAuthenticatedLimiter() {
    const config = this.getEndpointLimits().authenticated;
    return this.createEnhancedLimiter(config, 'authenticated');
  }

  public createGovernanceLimiter() {
    const config = this.getEndpointLimits().governance;
    return this.createEnhancedLimiter(config, 'governance');
  }

  public createTreasuryLimiter() {
    const config = this.getEndpointLimits().treasury;
    return this.createEnhancedLimiter(config, 'treasury');
  }

  public createTradingLimiter() {
    const config = this.getEndpointLimits().trading;
    return this.createEnhancedLimiter(config, 'trading');
  }

  public createAnalyticsLimiter() {
    const config = this.getEndpointLimits().analytics;
    return this.createEnhancedLimiter(config, 'analytics');
  }

  private createEnhancedLimiter(config: RateLimitConfig, type: string) {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: {
        error: config.message,
        type,
        limit: config.max,
        windowMs: config.windowMs,
        retryAfter: Math.ceil(config.windowMs / 1000)
      },
      standardHeaders: true, // Return rate limit info in headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      keyGenerator: this.createKeyGenerator(type),
      handler: this.createRateLimitHandler(type),
      skip: this.createSkipFunction(type)
    });
  }

  private createKeyGenerator(type: string) {
    return (req: Request): string => {
      // Use API key if available, otherwise user address, otherwise IP
      const apiKey = req.headers['x-api-key'] as string;
      const userAddress = (req as any).user?.address;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      if (apiKey) {
        return `api:${apiKey}:${type}`;
      }

      if (userAddress) {
        return `user:${userAddress.toLowerCase()}:${type}`;
      }

      return `ip:${ip}:${type}`;
    };
  }

  private createRateLimitHandler(type: string) {
    return (req: Request, res: Response): void => {
      this.logger.warn('Rate limit exceeded', {
        type,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        apiKey: req.headers['x-api-key'] ? 'present' : 'absent',
        user: (req as any).user?.address || 'anonymous'
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        type,
        limit: this.getEndpointLimits()[type as keyof PerEndpointLimits].max,
        windowMs: this.getEndpointLimits()[type as keyof PerEndpointLimits].windowMs,
        retryAfter: Math.ceil(this.getEndpointLimits()[type as keyof PerEndpointLimits].windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    };
  }

  private createSkipFunction(type: string) {
    return (req: Request): boolean => {
      // Skip rate limiting for health checks and system endpoints
      if (req.path === '/health' || req.path.startsWith('/api/system')) {
        return true;
      }

      // Skip for admin users (can be configured)
      const isAdmin = (req as any).user?.role === 'admin';
      if (isAdmin && process.env.SKIP_RATE_LIMIT_FOR_ADMIN === 'true') {
        return true;
      }

      // Skip for successful requests on certain endpoints
      if (type === 'analytics' && req.method === 'GET') {
        // Allow more analytics reads
        return false;
      }

      return false;
    };
  }

  // Advanced rate limiting for specific scenarios
  public createBurstLimiter(maxBurst: number, cooldownMs: number) {
    return rateLimit({
      windowMs: cooldownMs,
      max: maxBurst,
      message: {
        error: 'Burst limit exceeded',
        maxBurst,
        cooldownMs,
        retryAfter: Math.ceil(cooldownMs / 1000)
      },
      keyGenerator: (req: Request) => {
        return `burst:${req.ip}:${req.path}`;
      }
    });
  }

  public createWriteLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 write operations per minute
      message: {
        error: 'Too many write operations',
        limit: 10,
        windowMs: 60000,
        retryAfter: 60
      },
      keyGenerator: (req: Request) => {
        const userAddress = (req as any).user?.address;
        const apiKey = req.headers['x-api-key'] as string;
        
        if (apiKey) {
          return `write:api:${apiKey}`;
        }
        
        if (userAddress) {
          return `write:user:${userAddress.toLowerCase()}`;
        }
        
        return `write:ip:${req.ip}`;
      },
      skip: (req: Request) => {
        // Only apply to write methods
        return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      }
    });
  }

  // Rate limit monitoring and analytics
  public async getRateLimitStats(): Promise<{
    totalActiveLimits: number;
    cacheStats: any;
    topLimitedEndpoints: Array<{ endpoint: string; limitHits: number }>;
  }> {
    try {
      // Get cache statistics
      const cacheStats = this.cache.getCacheStats();
      
      // Get rate limit hit statistics from cache
      const limitHits: Record<string, number> = await this.cache.get('rate_limit_stats') || {};
      
      // Sort endpoints by limit hits
      const topLimitedEndpoints = Object.entries(limitHits)
        .map(([endpoint, hits]) => ({ endpoint, limitHits: hits as number }))
        .sort((a, b) => b.limitHits - a.limitHits)
        .slice(0, 10);

      return {
        totalActiveLimits: Object.keys(this.getEndpointLimits()).length,
        cacheStats,
        topLimitedEndpoints
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit stats:', error);
      return {
        totalActiveLimits: 0,
        cacheStats: {},
        topLimitedEndpoints: []
      };
    }
  }

  public async recordRateLimitHit(endpoint: string, identifier: string): Promise<void> {
    try {
      const key = `rate_limit_hit:${endpoint}:${identifier}`;
      await this.cache.increment(key, 1);
      await this.cache.expire(key, 3600); // Keep for 1 hour

      // Update global stats
      const statsKey = 'rate_limit_stats';
      const stats = await this.cache.get(statsKey) || {};
      stats[endpoint] = (stats[endpoint] || 0) + 1;
      await this.cache.set(statsKey, stats, 3600);
    } catch (error) {
      this.logger.error('Failed to record rate limit hit:', error);
    }
  }

  // Dynamic rate limit adjustment
  public async adjustRateLimit(endpoint: string, factor: number): Promise<void> {
    try {
      const adjustmentKey = `rate_limit_adjustment:${endpoint}`;
      await this.cache.set(adjustmentKey, {
        factor,
        timestamp: Date.now()
      }, 300); // 5 minutes

      this.logger.info(`Rate limit adjusted for ${endpoint}`, { factor });
    } catch (error) {
      this.logger.error('Failed to adjust rate limit:', error);
    }
  }

  public async getRateLimitAdjustment(endpoint: string): Promise<number | null> {
    try {
      const adjustmentKey = `rate_limit_adjustment:${endpoint}`;
      const adjustment: { factor: number; timestamp: number } | null = await this.cache.get(adjustmentKey);
      
      if (adjustment && Date.now() - adjustment.timestamp < 300000) { // 5 minutes
        return adjustment.factor;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to get rate limit adjustment:', error);
      return null;
    }
  }
}
