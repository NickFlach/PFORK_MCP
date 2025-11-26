import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

export class CacheService {
  private redis: Redis;
  private logger: Logger;
  private isConnected: boolean = false;

  constructor() {
    this.logger = new Logger('CacheService');
    
    // Initialize Redis with fallback to in-memory cache
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.logger.info('Redis connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.logger.warn('Redis connection failed, using in-memory fallback:', error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

    } catch (error: any) {
      this.logger.warn('Redis initialization failed, using in-memory cache:', error);
      this.redis = null as any;
    }
  }

  public async connect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.connect();
      } catch (error) {
        this.logger.warn('Failed to connect to Redis:', error);
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.disconnect();
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis && this.isConnected) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      }
      
      // Fallback to in-memory cache
      return this.getMemoryCache<T>(key);
    } catch (error) {
      this.logger.error('Cache get failed:', error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.redis && this.isConnected) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        // Fallback to in-memory cache
        this.setMemoryCache(key, value, ttl);
      }
    } catch (error) {
      this.logger.error('Cache set failed:', error);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      if (this.redis && this.isConnected) {
        await this.redis.del(key);
      } else {
        // Fallback to in-memory cache
        this.delMemoryCache(key);
      }
    } catch (error) {
      this.logger.error('Cache delete failed:', error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      if (this.redis && this.isConnected) {
        const result = await this.redis.exists(key);
        return result === 1;
      }
      
      // Fallback to in-memory cache
      return this.existsMemoryCache(key);
    } catch (error) {
      this.logger.error('Cache exists check failed:', error);
      return false;
    }
  }

  public async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (this.redis && this.isConnected) {
        return await this.redis.incrby(key, amount);
      }
      
      // Fallback to in-memory cache
      return this.incrementMemoryCache(key, amount);
    } catch (error) {
      this.logger.error('Cache increment failed:', error);
      return 0;
    }
  }

  public async expire(key: string, ttl: number): Promise<void> {
    try {
      if (this.redis && this.isConnected) {
        await this.redis.expire(key, ttl);
      } else {
        // Fallback to in-memory cache
        this.expireMemoryCache(key, ttl);
      }
    } catch (error) {
      this.logger.error('Cache expire failed:', error);
    }
  }

  // In-memory cache fallback
  private memoryCache = new Map<string, { value: any; expires: number }>();

  private getMemoryCache<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  private setMemoryCache(key: string, value: any, ttl: number): void {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  private delMemoryCache(key: string): void {
    this.memoryCache.delete(key);
  }

  private existsMemoryCache(key: string): boolean {
    const item = this.memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return false;
    }
    
    return true;
  }

  private incrementMemoryCache(key: string, amount: number): number {
    const item = this.memoryCache.get(key);
    let currentValue = 0;
    
    if (item && typeof item.value === 'number') {
      currentValue = item.value;
    }
    
    const newValue = currentValue + amount;
    this.setMemoryCache(key, newValue, 300); // 5 minutes default TTL
    return newValue;
  }

  private expireMemoryCache(key: string, ttl: number): void {
    const item = this.memoryCache.get(key);
    if (item) {
      item.expires = Date.now() + (ttl * 1000);
    }
  }

  // Cache utility methods
  public async getCachedContractData(contractName: string, method: string, params: any[], ttl: number = 60): Promise<any> {
    const cacheKey = `contract:${contractName}:${method}:${JSON.stringify(params)}`;
    
    // Try to get from cache first
    const cached = await this.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    return null; // Indicate cache miss
  }

  public async setCachedContractData(contractName: string, method: string, params: any[], data: any, ttl: number = 60): Promise<void> {
    const cacheKey = `contract:${contractName}:${method}:${JSON.stringify(params)}`;
    await this.set(cacheKey, data, ttl);
  }

  public async getCachedApiResponse(endpoint: string, params: any, ttl: number = 30): Promise<any> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.get(cacheKey);
  }

  public async setCachedApiResponse(endpoint: string, params: any, data: any, ttl: number = 30): Promise<void> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    await this.set(cacheKey, data, ttl);
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.redis && this.isConnected) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Fallback: iterate through memory cache
        for (const key of this.memoryCache.keys()) {
          if (this.matchesPattern(key, pattern)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      this.logger.error('Cache pattern invalidation failed:', error);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  public getCacheStats(): {
    isConnected: boolean;
    memoryCacheSize: number;
    redisConnected: boolean;
  } {
    return {
      isConnected: this.isConnected,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis && this.isConnected
    };
  }
}
