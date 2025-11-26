import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { Logger } from '../utils/Logger';
import { CacheService } from '../services/CacheService';

interface ApiKey {
  key: string;
  name: string;
  permissions: string[];
  rateLimitMultiplier: number;
  isActive: boolean;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    privateKey: string;
    signature: string;
  };
  apiKey?: ApiKey;
}

export class ApiKeyService {
  private cache: CacheService;
  private logger: Logger;

  constructor(cache: CacheService) {
    this.cache = cache;
    this.logger = new Logger('ApiKeyService');
  }

  public authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
          // No API key, proceed to wallet authentication
          return next();
        }

        // Validate API key format
        if (!this.isValidApiKeyFormat(apiKey)) {
          res.status(401).json({
            error: 'Invalid API key format',
            expected: 'pfork_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          });
          return;
        }

        // Get API key from cache or database
        const keyData = await this.getApiKey(apiKey);
        
        if (!keyData) {
          res.status(401).json({
            error: 'API key not found or inactive',
            key: this.maskApiKey(apiKey)
          });
          return;
        }

        if (!keyData.isActive) {
          res.status(401).json({
            error: 'API key has been deactivated',
            key: this.maskApiKey(apiKey)
          });
          return;
        }

        // Update usage statistics
        await this.updateApiKeyUsage(apiKey);

        // Attach API key data to request
        req.apiKey = keyData;

        this.logger.info('API key authenticated', {
          keyName: keyData.name,
          permissions: keyData.permissions,
          ip: req.ip
        });

        next();
      } catch (error) {
        this.logger.error('API key authentication failed:', error);
        res.status(500).json({
          error: 'API key authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  public authorize(requiredPermissions: string[] = []) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      // Check if authenticated via API key or wallet
      if (!req.apiKey && !req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // If using API key, check permissions
      if (req.apiKey) {
        const hasPermission = this.checkPermissions(req.apiKey.permissions, requiredPermissions);
        
        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient API key permissions',
            required: requiredPermissions,
            current: req.apiKey.permissions
          });
          return;
        }
      }

      // If using wallet, check user role (existing logic)
      if (req.user) {
        const userRole = this.getUserRole(req.user.address);
        const hasPermission = this.checkRolePermissions(userRole, requiredPermissions);
        
        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient permissions',
            required: requiredPermissions,
            current: userRole
          });
          return;
        }
      }

      next();
    };
  }

  public async createApiKey(name: string, permissions: string[], rateLimitMultiplier: number = 1): Promise<string | null> {
    try {
      const apiKey = this.generateApiKey();
      const keyData: ApiKey = {
        key: apiKey,
        name,
        permissions,
        rateLimitMultiplier,
        isActive: true,
        createdAt: Date.now(),
        lastUsed: 0,
        usageCount: 0
      };

      // Store API key in cache (in production, this would be a database)
      await this.storeApiKey(apiKey, keyData);

      this.logger.info('API key created', { name, permissions, rateLimitMultiplier });
      return apiKey;
    } catch (error) {
      this.logger.error('Failed to create API key:', error);
      return null;
    }
  }

  public async deactivateApiKey(apiKey: string): Promise<boolean> {
    try {
      const keyData = await this.getApiKey(apiKey);
      if (!keyData) {
        return false;
      }

      keyData.isActive = false;
      await this.storeApiKey(apiKey, keyData);

      this.logger.info('API key deactivated', { name: keyData.name });
      return true;
    } catch (error) {
      this.logger.error('Failed to deactivate API key:', error);
      return false;
    }
  }

  public async getApiKeyUsage(apiKey: string): Promise<{
    usageCount: number;
    lastUsed: number;
    rateLimitMultiplier: number;
  } | null> {
    try {
      const keyData = await this.getApiKey(apiKey);
      if (!keyData) {
        return null;
      }

      return {
        usageCount: keyData.usageCount,
        lastUsed: keyData.lastUsed,
        rateLimitMultiplier: keyData.rateLimitMultiplier
      };
    } catch (error) {
      this.logger.error('Failed to get API key usage:', error);
      return null;
    }
  }

  private async getApiKey(apiKey: string): Promise<ApiKey | null> {
    try {
      // Try to get from cache first
      const cached = await this.cache.get(`api_key:${apiKey}`);
      if (cached) {
        return cached;
      }

      // In production, this would query a database
      // For now, we'll use environment variables for demo keys
      const demoKeys = this.getDemoApiKeys();
      const keyData = demoKeys[apiKey];
      
      if (keyData) {
        // Cache the result
        await this.cache.set(`api_key:${apiKey}`, keyData, 300); // 5 minutes
        return keyData;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get API key:', error);
      return null;
    }
  }

  private async storeApiKey(apiKey: string, keyData: ApiKey): Promise<void> {
    try {
      // Store in cache (in production, this would be a database)
      await this.cache.set(`api_key:${apiKey}`, keyData, 86400); // 24 hours
    } catch (error) {
      this.logger.error('Failed to store API key:', error);
    }
  }

  private async updateApiKeyUsage(apiKey: string): Promise<void> {
    try {
      const keyData = await this.getApiKey(apiKey);
      if (!keyData) {
        return;
      }

      keyData.lastUsed = Date.now();
      keyData.usageCount++;

      await this.storeApiKey(apiKey, keyData);

      // Update usage statistics
      const usageKey = `api_key_usage:${apiKey}:${new Date().toISOString().slice(0, 10)}`;
      await this.cache.increment(usageKey, 1);
      await this.cache.expire(usageKey, 86400 * 30); // Keep for 30 days
    } catch (error) {
      this.logger.error('Failed to update API key usage:', error);
    }
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    // Expected format: pfork_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    return /^pfork_[a-fA-F0-9]{32}$/.test(apiKey);
  }

  private generateApiKey(): string {
    const randomBytes = ethers.hexlify(ethers.randomBytes(16));
    return `pfork_${randomBytes.slice(2)}`;
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '****';
    }
    return apiKey.slice(0, 8) + '****';
  }

  private checkPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (requiredPermissions.length === 0) {
      return true; // No specific permissions required
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    );
  }

  private getUserRole(address: string): string {
    // In a production environment, this would query a database or smart contract
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
    
    if (adminAddresses.includes(address.toLowerCase())) {
      return 'admin';
    }

    return 'user';
  }

  private checkRolePermissions(role: string, requiredPermissions: string[]): boolean {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['*'],
      'operator': ['read', 'write', 'governance', 'treasury'],
      'user': ['read', 'write']
    };

    const userPermissions = rolePermissions[role] || [];
    return this.checkPermissions(userPermissions, requiredPermissions);
  }

  private getDemoApiKeys(): Record<string, ApiKey> {
    // Demo API keys for development (in production, these would be in a database)
    return {
      'pfork_1234567890abcdef1234567890abcdef': {
        key: 'pfork_1234567890abcdef1234567890abcdef',
        name: 'Demo Analytics Key',
        permissions: ['analytics:read', 'protocol:read', 'dex:read'],
        rateLimitMultiplier: 2,
        isActive: true,
        createdAt: Date.now() - 86400000, // 1 day ago
        lastUsed: 0,
        usageCount: 0
      },
      'pfork_fedcba0987654321fedcba0987654321': {
        key: 'pfork_fedcba0987654321fedcba0987654321',
        name: 'Demo Trading Bot Key',
        permissions: ['dex:read', 'dex:write', 'treasury:read'],
        rateLimitMultiplier: 5,
        isActive: true,
        createdAt: Date.now() - 172800000, // 2 days ago
        lastUsed: 0,
        usageCount: 0
      }
    };
  }

  // API key management endpoints
  public async getApiKeys(): Promise<ApiKey[]> {
    try {
      // In production, this would query a database
      const demoKeys = this.getDemoApiKeys();
      return Object.values(demoKeys).map(key => ({
        ...key,
        key: this.maskApiKey(key.key)
      }));
    } catch (error) {
      this.logger.error('Failed to get API keys:', error);
      return [];
    }
  }

  public async getApiKeyStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsage: number;
    topUsedKeys: Array<{ name: string; usageCount: number }>;
  }> {
    try {
      const apiKeys = await this.getApiKeys();
      const activeKeys = apiKeys.filter(key => key.isActive).length;
      
      // Get usage statistics from cache
      const usageStats: Record<string, number> = await this.cache.get('api_key_usage_stats') || {};
      
      const topUsedKeys = Object.entries(usageStats)
        .map(([name, usage]) => ({ name, usageCount: usage as number }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      return {
        totalKeys: apiKeys.length,
        activeKeys,
        totalUsage: Object.values(usageStats).reduce((sum, usage) => sum + (usage as number), 0),
        topUsedKeys
      };
    } catch (error) {
      this.logger.error('Failed to get API key stats:', error);
      return {
        totalKeys: 0,
        activeKeys: 0,
        totalUsage: 0,
        topUsedKeys: []
      };
    }
  }

  private async getApiKeyUsageStats(): Promise<Record<string, number>> {
    try {
      // Get usage statistics from cache
      const usageStats: Record<string, number> = await this.cache.get('api_key_usage_stats') || {};
      return usageStats;
    } catch (error) {
      this.logger.error('Failed to get API key usage stats:', error);
      return {};
    }
  }
}
