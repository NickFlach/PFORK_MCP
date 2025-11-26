import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { Logger } from '../utils/Logger';

interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    privateKey: string;
    signature: string;
  };
  apiKey?: ApiKey;
}

export class AuthMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AuthMiddleware');
  }

  public authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { signature, message, address } = req.headers;

        if (!signature || !message || !address) {
          res.status(401).json({ 
            error: 'Missing authentication headers',
            required: ['signature', 'message', 'address']
          });
          return;
        }

        // Verify the signature
        const recoveredAddress = ethers.verifyMessage(message as string, signature as string);
        
        if (recoveredAddress.toLowerCase() !== (address as string).toLowerCase()) {
          res.status(401).json({ 
            error: 'Invalid signature',
            recovered: recoveredAddress,
            expected: address
          });
          return;
        }

        // Check if message is recent (prevent replay attacks)
        const messageTimestamp = this.extractTimestampFromMessage(message as string);
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (now - messageTimestamp > maxAge) {
          res.status(401).json({ 
            error: 'Message expired',
            timestamp: messageTimestamp,
            now,
            maxAge
          });
          return;
        }

        // For server-side operations, we need the private key
        // In a production environment, this would be handled more securely
        const privateKey = this.getPrivateKeyForAddress(recoveredAddress);
        
        if (!privateKey) {
          res.status(401).json({ 
            error: 'No private key found for address',
            address: recoveredAddress
          });
          return;
        }

        req.user = {
          address: recoveredAddress,
          privateKey,
          signature: signature as string
        };

        this.logger.info('User authenticated', { address: recoveredAddress });
        next();
      } catch (error) {
        this.logger.error('Authentication failed:', error);
        res.status(401).json({ 
          error: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  public authorize(requiredRole: string = 'user') {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user has required role
      // This would involve checking against a user database or contract
      const userRole = this.getUserRole(req.user.address);
      
      if (!this.hasPermission(userRole, requiredRole)) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredRole,
          current: userRole
        });
        return;
      }

      next();
    };
  }

  public rateLimitByUser() {
    const userRequests = new Map<string, { count: number; resetTime: number }>();
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        next();
        return;
      }

      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = 100; // 100 requests per minute per user

      const userKey = req.user.address;
      const userLimit = userRequests.get(userKey);

      if (!userLimit || now > userLimit.resetTime) {
        userRequests.set(userKey, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }

      if (userLimit.count >= maxRequests) {
        res.status(429).json({ 
          error: 'Rate limit exceeded',
          limit: maxRequests,
          windowMs,
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
        return;
      }

      userLimit.count++;
      next();
    };
  }

  private extractTimestampFromMessage(message: string): number {
    try {
      // Expected message format: "Pitchforks MCP Authentication at {timestamp}"
      const match = message.match(/at (\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private getPrivateKeyForAddress(address: string): string | null {
    // In a production environment, this would be handled securely
    // For development, we'll use environment variables or a secure key store
    const privateKeyMap: Record<string, string> = {
      [process.env.DEVELOPER_ADDRESS?.toLowerCase() || '']: process.env.DEVELOPER_PRIVATE_KEY || ''
    };

    return privateKeyMap[address.toLowerCase()] || null;
  }

  private getUserRole(address: string): string {
    // In a production environment, this would query a database or smart contract
    // For now, we'll use a simple mapping
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
    
    if (adminAddresses.includes(address.toLowerCase())) {
      return 'admin';
    }

    return 'user';
  }

  private hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'user': 0,
      'operator': 1,
      'admin': 2,
      'owner': 3
    };

    return roleHierarchy[userRole as keyof typeof roleHierarchy] >= 
           roleHierarchy[requiredRole as keyof typeof roleHierarchy];
  }
}

// Export the middleware function
export const authMiddleware = new AuthMiddleware().authenticate();
