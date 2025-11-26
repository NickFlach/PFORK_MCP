import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ContractRegistry } from './services/ContractRegistry';
import { EventStreamingService } from './services/EventStreamingService';
import { Logger } from './utils/Logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { ProtocolRouter } from './routers/ProtocolRouter';
import { DexRouter } from './routers/DexRouter';
import { FerryRouter } from './routers/FerryRouter';
import { TreasuryRouter } from './routers/TreasuryRouter';
import { AnalyticsRouter } from './routers/AnalyticsRouter';

// Load environment variables
dotenv.config();

class PitchforksMCPServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private contractRegistry: ContractRegistry;
  private eventStreaming: EventStreamingService;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.logger = new Logger('MCPServer');
    
    this.initializeMiddleware();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeWebSocket();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const publicLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests from this IP'
    });

    const authLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 1000, // 1000 requests per minute for authenticated users
      keyGenerator: (req) => req.user?.address || req.ip,
      skip: (req) => !req.user
    });

    const writeLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 write operations per minute
      keyGenerator: (req) => req.user?.address || req.ip,
      skip: (req) => !['POST', 'PUT', 'DELETE'].includes(req.method)
    });

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use('/api', publicLimiter);
    this.app.use('/api/auth', authLimiter);
    this.app.use(['/api/protocol', '/api/dex', '/api/ferry', '/api/treasury'], writeLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.address || 'anonymous'
      });
      next();
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize contract registry with provider pooling
      this.contractRegistry = new ContractRegistry();
      await this.contractRegistry.initialize();

      // Initialize event streaming service
      this.eventStreaming = new EventStreamingService(
        this.contractRegistry,
        this.wss
      );
      await this.eventStreaming.start();

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        network: process.env.NETWORK || 'neo-x',
        chainId: process.env.CHAIN_ID || '47763'
      });
    });

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Pitchforks Ecosystem MCP Server',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          protocol: '/api/protocol/*',
          dex: '/api/dex/*',
          ferry: '/api/ferry/*',
          treasury: '/api/treasury/*',
          analytics: '/api/analytics/*'
        },
        documentation: '/api/docs',
        websocket: 'ws://localhost:3001/ws'
      });
    });

    // Project-specific routers
    this.app.use('/api/protocol', new ProtocolRouter(this.contractRegistry).getRouter());
    this.app.use('/api/dex', new DexRouter(this.contractRegistry).getRouter());
    this.app.use('/api/ferry', new FerryRouter(this.contractRegistry).getRouter());
    this.app.use('/api/treasury', new TreasuryRouter(this.contractRegistry).getRouter());
    this.app.use('/api/analytics', new AnalyticsRouter(this.contractRegistry).getRouter());

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
          '/api/protocol/*',
          '/api/dex/*',
          '/api/ferry/*',
          '/api/treasury/*',
          '/api/analytics/*'
        ]
      });
    });

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  private initializeWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      this.logger.info('WebSocket client connected', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        server: 'Pitchforks MCP Server',
        version: process.env.npm_package_version || '1.0.0'
      }));

      // Handle subscription requests
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscribe') {
            await this.eventStreaming.subscribe(ws, message.filters || {});
            ws.send(JSON.stringify({
              type: 'subscribed',
              filters: message.filters || {},
              timestamp: new Date().toISOString()
            }));
          } else if (message.type === 'unsubscribe') {
            await this.eventStreaming.unsubscribe(ws, message.filters || {});
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              filters: message.filters || {},
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          this.logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected');
        this.eventStreaming.unsubscribe(ws, {});
      });

      // Handle errors
      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
      });
    });
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3001;
    
    return new Promise((resolve, reject) => {
      this.server.listen(port, (error?: Error) => {
        if (error) {
          this.logger.error('Failed to start server:', error);
          reject(error);
        } else {
          this.logger.info(`🚀 Pitchforks MCP Server started on port ${port}`);
          this.logger.info(`📡 WebSocket server ready`);
          this.logger.info(`🔗 API available at http://localhost:${port}/api`);
          resolve();
        }
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.eventStreaming) {
        await this.eventStreaming.stop();
      }
      
      this.server.close(() => {
        this.logger.info('🛑 Pitchforks MCP Server stopped');
        resolve();
      });
    });
  }
}

// Start the server
async function main() {
  const server = new PitchforksMCPServer();
  
  try {
    await server.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  main();
}

export default PitchforksMCPServer;
