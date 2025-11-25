# Pitchforks Ecosystem MCP Server - Recommendations Document

## Overview

This document outlines the recommended MCP (Model Context Protocol) tools, resources, and prompts needed to fully integrate with the Pitchforks ecosystem. Use this as a blueprint for building out the required APIs and backend functionality on each Pitchforks site.

---

## Ecosystem Sites Summary

| Site | Domain | Status | Purpose |
|------|--------|--------|---------|
| **Protocol** | protocol.pitchforks.social | Live | Core governance & whitepaper - decentralized resistance tools |
| **DEX** | dex.pitchforks.social | Live | Token trading on Neo X |
| **Ferry** | ferry.pitchforks.social | Live | Cross-chain bridge (Ethereum ⇋ Neo X) |
| **Analyst** | analyst.pitchforks.social | Planned | Analytics and data tools |
| **App** | app.pitchforks.social | Live | Social network (Minds-powered) |
| **Root** | pitchforks.social | Live | Main landing/portal |

---

## 1. PROTOCOL (protocol.pitchforks.social)

### Recommended MCP Tools

| Tool Name | Description | Required API Endpoint |
|-----------|-------------|----------------------|
| `get-whitepaper` | Retrieve the current whitepaper content | `GET /api/whitepaper` |
| `get-governance-proposals` | List all active governance proposals | `GET /api/governance/proposals` |
| `get-proposal-details` | Get details of a specific proposal | `GET /api/governance/proposals/{id}` |
| `submit-proposal` | Create a new governance proposal | `POST /api/governance/proposals` |
| `vote-on-proposal` | Cast a vote on a proposal | `POST /api/governance/proposals/{id}/vote` |
| `get-protocol-stats` | Get overall protocol statistics | `GET /api/stats` |
| `get-token-info` | Get NEO token information | `GET /api/token` |

### Recommended Resources

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `protocol://whitepaper` | Current whitepaper document | Static or CMS |
| `protocol://governance/active` | Active proposals feed | Database |
| `protocol://stats` | Real-time protocol metrics | Blockchain + DB |

### Required Backend Work

```
- [ ] Create REST API endpoints for governance
- [ ] Implement proposal submission logic
- [ ] Connect to Neo X for on-chain voting
- [ ] Create stats aggregation service
```

---

## 2. DEX (dex.pitchforks.social)

### Recommended MCP Tools

| Tool Name | Description | Required API Endpoint |
|-----------|-------------|----------------------|
| `get-token-pairs` | List all available trading pairs | `GET /api/pairs` |
| `get-token-price` | Get current price for a token | `GET /api/price/{token}` |
| `get-liquidity-pools` | List liquidity pools and TVL | `GET /api/pools` |
| `get-swap-quote` | Get a quote for a token swap | `POST /api/swap/quote` |
| `execute-swap` | Execute a token swap (requires wallet) | `POST /api/swap/execute` |
| `get-order-history` | Get user's trading history | `GET /api/orders/{address}` |
| `get-dex-stats` | Get overall DEX statistics | `GET /api/stats` |
| `add-liquidity` | Add liquidity to a pool | `POST /api/pools/{id}/add` |
| `remove-liquidity` | Remove liquidity from a pool | `POST /api/pools/{id}/remove` |

### Recommended Resources

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `dex://pairs` | All trading pairs list | Smart contract |
| `dex://prices` | Real-time price feed | Oracle/DEX |
| `dex://pools` | Liquidity pool data | Smart contract |
| `dex://volume/24h` | 24-hour trading volume | Aggregated logs |

### Required Backend Work

```
- [ ] Create REST API wrapper for Neo X smart contracts
- [ ] Implement price oracle integration
- [ ] Build swap quote engine
- [ ] Create order/transaction logging service
- [ ] Implement WebSocket for real-time prices (optional)
```

### Smart Contract Integration Notes

- Contract Address: `0x62Cf7e56...cE62` (verify full address)
- Chain: Neo X
- Requires: Neo X RPC endpoint, contract ABI

---

## 3. FERRY / FERRYMANX (ferry.pitchforks.social)

### Recommended MCP Tools

| Tool Name | Description | Required API Endpoint |
|-----------|-------------|----------------------|
| `get-bridge-status` | Check if bridge is operational | `GET /api/bridge/status` |
| `get-supported-tokens` | List tokens that can be bridged | `GET /api/bridge/tokens` |
| `get-bridge-quote` | Get quote for bridging tokens | `POST /api/bridge/quote` |
| `initiate-bridge` | Start a bridge transaction | `POST /api/bridge/initiate` |
| `get-bridge-transaction` | Check status of a bridge tx | `GET /api/bridge/tx/{id}` |
| `get-bridge-history` | Get user's bridge history | `GET /api/bridge/history/{address}` |
| `get-bridge-fees` | Get current bridging fees | `GET /api/bridge/fees` |
| `estimate-bridge-time` | Estimate completion time | `POST /api/bridge/estimate` |

### Recommended Resources

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `ferry://status` | Bridge operational status | Health check |
| `ferry://tokens` | Supported tokens list | Configuration |
| `ferry://fees` | Current fee structure | Dynamic calc |
| `ferry://pending` | Pending transactions | Database |

### Required Backend Work

```
- [ ] Create bridge status monitoring service
- [ ] Implement Ethereum ⇋ Neo X relay system
- [ ] Build transaction tracking database
- [ ] Create fee calculation service
- [ ] Implement bridge security validation
```

### Cross-Chain Integration Notes

- Source Chain: Ethereum (EVM)
- Destination Chain: Neo X
- Requires: Both chain RPC endpoints, bridge contracts on both sides

---

## 4. ANALYST (analyst.pitchforks.social)

*Note: Currently returns "Not Found" - this site is planned but not yet built.*

### Recommended MCP Tools

| Tool Name | Description | Required API Endpoint |
|-----------|-------------|----------------------|
| `get-portfolio-analysis` | Analyze a wallet's holdings | `POST /api/analyze/portfolio` |
| `get-token-analytics` | Detailed token metrics | `GET /api/analytics/token/{address}` |
| `get-whale-movements` | Track large wallet movements | `GET /api/whales` |
| `get-market-sentiment` | Sentiment analysis for ecosystem | `GET /api/sentiment` |
| `get-ecosystem-health` | Overall ecosystem health score | `GET /api/health` |
| `get-historical-data` | Historical price/volume data | `GET /api/history/{token}` |
| `generate-report` | Generate comprehensive report | `POST /api/reports/generate` |
| `compare-tokens` | Compare multiple token metrics | `POST /api/compare` |

### Recommended Resources

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `analyst://market-overview` | Market summary dashboard | Aggregated |
| `analyst://alerts` | Active alerts and notifications | Rules engine |
| `analyst://reports/latest` | Most recent generated reports | Database |

### Required Backend Work

```
- [ ] Build data aggregation pipeline from all ecosystem sites
- [ ] Implement portfolio analysis algorithms
- [ ] Create whale tracking service
- [ ] Build sentiment analysis (social feeds)
- [ ] Create report generation engine
- [ ] Set up time-series database for historical data
```

---

## 5. APP (app.pitchforks.social)

*Social network powered by Minds Networks*

### Recommended MCP Tools

| Tool Name | Description | Required API Endpoint |
|-----------|-------------|----------------------|
| `get-user-profile` | Get user profile by handle | `GET /api/v3/users/{handle}` |
| `get-user-feed` | Get a user's content feed | `GET /api/v3/users/{handle}/feed` |
| `get-trending` | Get trending content | `GET /api/v3/trending` |
| `search-content` | Search posts and users | `GET /api/v3/search` |
| `get-membership-info` | Get membership tier details | `GET /api/v3/memberships` |
| `get-wallet-balance` | Get user's token balance | `GET /api/v3/wallet/{address}` |
| `post-content` | Create a new post | `POST /api/v3/posts` |
| `get-notifications` | Get user notifications | `GET /api/v3/notifications` |

### Recommended Resources

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `app://trending` | Trending content feed | Minds API |
| `app://memberships` | Membership tiers info | Static/Config |
| `app://community-guidelines` | Content policies | CMS |

### Required Backend Work

```
- [ ] Map Minds Networks API to MCP-compatible endpoints
- [ ] Implement OAuth/authentication flow
- [ ] Create content moderation hooks
- [ ] Build notification aggregation
```

### Notes

- Powered by Minds Networks (https://networks.minds.com/)
- Has existing API infrastructure (v3)
- Membership: "Shinobi Oasis" at $60/month

---

## 6. CROSS-ECOSYSTEM TOOLS

These tools span multiple Pitchforks sites:

| Tool Name | Description | Sites Involved |
|-----------|-------------|----------------|
| `get-ecosystem-overview` | Combined stats from all sites | All |
| `get-user-activity` | User's activity across ecosystem | App, DEX, Ferry |
| `get-total-value-locked` | TVL across DEX + Ferry | DEX, Ferry |
| `execute-workflow` | Multi-step cross-site actions | Multiple |

---

## API Design Recommendations

### Authentication

All API endpoints should support:

1. **API Key Authentication** (for MCP server)
   - Header: `x-api-key: {key}`
   - Used for server-to-server communication

2. **Wallet Signature Authentication** (for user actions)
   - EIP-712 typed signatures for Ethereum
   - Neo X equivalent for Neo-side operations

### Response Format

Standardize all API responses:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-01-15T12:00:00Z",
  "requestId": "uuid"
}
```

### Error Handling

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Wallet does not have enough tokens",
    "details": { ... }
  }
}
```

### Rate Limiting

Recommended limits:
- Public endpoints: 100 requests/minute
- Authenticated endpoints: 1000 requests/minute
- Write operations: 10 requests/minute

---

## Environment Variables Needed

The MCP server will need these secrets/configs:

```env
# Authentication
SESSION_SECRET=your-mcp-api-key

# Protocol
PROTOCOL_API_URL=https://protocol.pitchforks.social/api
PROTOCOL_API_KEY=

# DEX
DEX_API_URL=https://dex.pitchforks.social/api
DEX_CONTRACT_ADDRESS=0x62Cf7e56...cE62
NEO_X_RPC_URL=

# Ferry
FERRY_API_URL=https://ferry.pitchforks.social/api
ETHEREUM_RPC_URL=
NEO_X_RPC_URL=

# Analyst
ANALYST_API_URL=https://analyst.pitchforks.social/api

# App (Minds)
APP_API_URL=https://app.pitchforks.social/api/v3
MINDS_API_KEY=
```

---

## Implementation Priority

### Phase 1 - Foundation (Current Sprint)
1. ✅ MCP Server infrastructure
2. 🔄 Placeholder tools with mock responses
3. 🔄 Update branding to Pitchforks

### Phase 2 - Read Operations
1. Protocol: Get whitepaper, stats, proposals
2. DEX: Get pairs, prices, pools
3. Ferry: Get status, tokens, fees
4. App: Get profiles, feeds, trending

### Phase 3 - Write Operations
1. Protocol: Vote, submit proposals
2. DEX: Execute swaps, manage liquidity
3. Ferry: Initiate bridge transactions
4. App: Post content, manage notifications

### Phase 4 - Advanced Features
1. Analyst: Full analytics suite
2. Cross-ecosystem workflows
3. Real-time updates via WebSocket
4. Portfolio tracking

---

## Next Steps for Backend Teams

### Protocol Team
- [ ] Expose governance API endpoints
- [ ] Create proposal submission endpoint
- [ ] Implement voting smart contract integration

### DEX Team
- [ ] Create REST API wrapper for DEX contract
- [ ] Implement price feed endpoint
- [ ] Build swap quote engine

### Ferry Team
- [ ] Create bridge status API
- [ ] Implement transaction tracking
- [ ] Build fee estimation service

### Analyst Team
- [ ] Design data aggregation architecture
- [ ] Plan database schema for analytics
- [ ] Spec out report generation system

### App Team
- [ ] Document existing Minds API endpoints
- [ ] Create MCP-specific auth flow
- [ ] Identify gaps in current API

---

## Questions for Product Team

1. Should MCP users have full write access or limited to read-only initially?
2. What authentication method should be used for wallet-connected actions?
3. Are there rate limit requirements specific to AI/LLM usage?
4. Should the Analyst site aggregate data from external sources (CoinGecko, etc.)?
5. What level of historical data should be maintained?

---

*Document Version: 1.0*
*Last Updated: November 2025*
*Author: Pitchforks MCP Team*
