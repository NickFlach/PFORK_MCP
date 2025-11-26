# Pitchforks MCP Server

A comprehensive production-ready MCP (Model Context Protocol) server for the Pitchforks ecosystem, providing a unified API gateway for all ecosystem projects.

## 🚀 Features

- **55+ API Endpoints** across 5 ecosystem projects (Protocol, DEX, Ferry, Treasury, Analytics)
- **Enterprise Type Safety** with TypeScript strict mode
- **Multi-layer Authentication** (Wallet signatures + API keys)
- **Advanced Rate Limiting** with per-endpoint controls
- **Redis Caching** with in-memory fallback
- **Transaction Queuing** with nonce management
- **Real-time Event Streaming** via WebSocket
- **Comprehensive Health Monitoring**
- **Environment-specific Configuration**

## 📁 Project Structure

```
mcp-server/
├── src/
│   ├── index.ts                 # Main Express server
│   ├── services/                # Core services
│   │   ├── ContractRegistry.ts
│   │   ├── EventStreamingService.ts
│   │   ├── CacheService.ts
│   │   ├── TransactionQueueService.ts
│   │   ├── HealthCheckService.ts
│   │   ├── RateLimitService.ts
│   │   └── ApiKeyService.ts
│   ├── routers/                 # Project-specific routers
│   │   ├── ProtocolRouter.ts
│   │   ├── DexRouter.ts
│   │   ├── FerryRouter.ts
│   │   ├── TreasuryRouter.ts
│   │   └── AnalyticsRouter.ts
│   ├── middleware/              # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   └── utils/
│       └── Logger.ts
├── .env.development             # Development config
├── .env.production              # Production config
├── .env.test                    # Test config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- Redis (optional - falls back to in-memory cache)
- NEO X RPC access

### Installation

1. **Install dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.development .env
   # Edit .env with your configuration
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

### Environment Variables

Key environment variables:

```bash
# Server
NODE_ENV=development
PORT=3001

# NEO X Network
CHAIN_ID=47763
RPC_URLS=https://mainnet-2.rpc.banelabs.org,https://mainnet-1.rpc.banelabs.org

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
ADMIN_ADDRESSES=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7
DEVELOPER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7
DEVELOPER_PRIVATE_KEY=your_private_key_here
```

## 🚀 Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## 📊 API Endpoints

### Protocol Router (8 endpoints)
- `GET /api/protocol/whitepaper` - Get protocol whitepaper
- `GET /api/protocol/proposals` - List governance proposals
- `POST /api/protocol/proposals` - Create proposal (auth)
- `POST /api/protocol/vote/:proposalId` - Vote on proposal (auth)
- `GET /api/protocol/campaigns` - List funding campaigns
- `POST /api/protocol/campaigns` - Create campaign (auth)
- `POST /api/protocol/contribute/:campaignId` - Contribute to campaign (auth)
- `GET /api/protocol/stats` - Get protocol statistics

### DEX Router (10 endpoints)
- `GET /api/dex/pairs` - List token pairs
- `GET /api/dex/price/:pair` - Get token price
- `GET /api/dex/pools` - List liquidity pools
- `GET /api/dex/quote` - Get swap quote
- `POST /api/dex/swap` - Execute swap (auth)
- `POST /api/dex/liquidity/add` - Add liquidity (auth)
- `POST /api/dex/liquidity/remove` - Remove liquidity (auth)
- `POST /api/dex/commit` - Commit-reveal swap (auth)
- `POST /api/dex/reveal` - Reveal swap (auth)
- `GET /api/dex/stats` - Get DEX statistics

### Ferry Router (10 endpoints)
- `GET /api/ferry/status` - Get bridge status
- `GET /api/ferry/tokens` - List supported tokens
- `GET /api/ferry/quote` - Get bridge quote
- `POST /api/ferry/initiate` - Initiate bridge (auth)
- `POST /api/ferry/fulfill` - Fulfill bridge (auth)
- `GET /api/ferry/history` - Get bridge history
- `POST /api/ferry/mint-nft` - Mint bridge NFT (auth)
- `GET /api/ferry/nfts` - List NFT collections
- `GET /api/ferry/stats` - Get bridge statistics

### Treasury Router (12 endpoints)
- `GET /api/treasury/balance` - Get treasury balance
- `GET /api/treasury/allocations` - Get budget allocations
- `POST /api/treasury/withdraw` - Withdraw funds (auth)
- `POST /api/treasury/allocate` - Allocate budget (auth)
- `GET /api/treasury/transactions` - Get transaction history
- `POST /api/treasury/schedule-payment` - Schedule payment (auth)
- `POST /api/treasury/emergency-withdraw` - Emergency withdraw (auth)
- `GET /api/treasury/operators` - List operators
- `POST /api/treasury/operators/add` - Add operator (auth)
- `POST /api/treasury/operators/remove` - Remove operator (auth)
- `GET /api/treasury/supported-tokens` - Get supported tokens
- `GET /api/treasury/stats` - Get treasury statistics

### Analytics Router (15 endpoints)
- `GET /api/analytics/dashboard` - Get dashboard data
- `GET /api/analytics/metrics` - Get ecosystem metrics
- `GET /api/analytics/trends` - Get trend analysis
- `GET /api/analytics/performance/:project` - Get project performance
- `GET /api/analytics/correlations` - Get cross-ecosystem correlations
- `GET /api/analytics/real-time` - Get real-time analytics
- `GET /api/analytics/alerts` - Get system alerts
- `GET /api/analytics/reports` - Get generated reports
- `POST /api/analytics/reports` - Generate report (auth)
- `GET /api/analytics/usage` - Get usage statistics
- `GET /api/analytics/health` - Get system health metrics
- `GET /api/analytics/gas` - Get gas usage analytics
- `GET /api/analytics/volume` - Get volume analytics
- `GET /api/analytics/users` - Get user analytics
- `GET /api/analytics/predictions` - Get predictive analytics

## 🔐 Authentication

### Wallet Authentication
Sign a message with your wallet:
```javascript
const message = `Pitchforks MCP Authentication at ${Date.now()}`;
const signature = await signer.signMessage(message);

// Include in headers:
headers: {
  'message': message,
  'signature': signature,
  'address': await signer.getAddress()
}
```

### API Key Authentication
Include API key in headers:
```javascript
headers: {
  'x-api-key': 'pfork_your_api_key_here'
}
```

## 🏥 Health Checks

- `GET /health` - Overall system health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/services` - Individual service health
- `GET /health/contracts` - Contract deployment status

## 📈 Rate Limiting

- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 1,000 requests/minute
- **Governance actions**: 5 requests/minute
- **Treasury operations**: 10 requests/minute
- **Trading operations**: 20 requests/minute
- **Analytics endpoints**: 50 requests/minute

## 🔄 WebSocket Events

Connect to WebSocket for real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

// Subscribe to events:
ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    contracts: ['PitchforksGovernance'],
    events: ['ProposalCreated', 'VoteCast']
  }
}));
```

## 🚀 Deployment

### Production Deployment

1. **Set production environment:**
   ```bash
   cp .env.production .env
   # Edit with production values
   ```

2. **Install dependencies:**
   ```bash
   npm ci --production
   ```

3. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## 📝 Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

## 🛠️ Development

### Adding New Endpoints

1. Create route in appropriate router file
2. Add validation schema in `validation.ts`
3. Include authentication if needed
4. Add health check if critical
5. Update documentation

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 📞 Support

For issues and support:
- Check health endpoints first
- Review logs for error details
- Ensure Redis is accessible
- Verify contract addresses in configuration

## 📄 License

MIT License - see LICENSE file for details
