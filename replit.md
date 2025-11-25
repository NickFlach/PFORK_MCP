# Pitchforks MCP Server

## Overview
This is a Model Context Protocol (MCP) server built with the xmcp TypeScript framework, designed to integrate with the Pitchforks ecosystem - decentralized tools for peaceful resistance against corruption and injustice.

## Pitchforks Ecosystem

The MCP server provides tools, prompts, and resources for interacting with:

| Site | Domain | Purpose |
|------|--------|---------|
| **Protocol** | protocol.pitchforks.social | Governance & Whitepaper |
| **DEX** | dex.pitchforks.social | Token Trading on Neo X |
| **Ferry** | ferry.pitchforks.social | Cross-chain Bridge (ETH ⇋ Neo X) |
| **Analyst** | analyst.pitchforks.social | Analytics (Coming Soon) |
| **App** | app.pitchforks.social | Social Network (Minds-powered) |

## Current Features

### Homepage
- Dark theme with Pitchforks branding
- Ecosystem site links with icons
- Dynamic tool/prompt/resource listings
- Copy-to-clipboard MCP configuration

### Authentication
- API Key Authentication using `SESSION_SECRET` environment variable
- All requests to `/mcp` endpoint require `x-api-key` header

### Available Tools

#### Ecosystem Tools
- **ecosystem-overview** - Comprehensive overview of all Pitchforks sites
- **get-server-info** - MCP server capabilities and structure

#### Protocol Tools
- **protocol-get-info** - Governance, whitepaper, and protocol stats

#### DEX Tools
- **dex-get-info** - Trading pairs, pools, and DEX information
- **dex-get-swap-quote** - Get swap quotes for token trades

#### Ferry Tools
- **ferry-get-status** - Bridge operational status
- **ferry-get-bridge-quote** - Get quotes for cross-chain transfers

#### Analyst Tools
- **analyst-get-overview** - Planned analytics features

#### App Tools
- **app-get-info** - Social network features and endpoints

### Available Prompts
- **ecosystem-guide** - Comprehensive guide to the Pitchforks ecosystem
- **swap-guide** - Step-by-step token swap instructions
- **bridge-guide** - Cross-chain bridging walkthrough

### Available Resources
- **pitchforks://ecosystem/status** - Real-time status of all sites
- **pitchforks://dex/prices** - Current token prices
- **pitchforks://ferry/status** - Bridge status and metrics

## Server Architecture
- **Express Server (Port 5000)**: Serves homepage and proxies MCP requests
- **xmcp Server (Port 3000)**: Handles MCP protocol requests with authentication
- **Endpoint**: `/mcp`
- **Protocol**: HTTP transport

## Environment Variables

### Required
- `SESSION_SECRET` - API key for MCP authentication

### Optional (for live data)
- `PROTOCOL_API_URL` - Protocol API base URL
- `DEX_API_URL` - DEX API base URL
- `DEX_CONTRACT_ADDRESS` - DEX smart contract address
- `FERRY_API_URL` - Ferry API base URL
- `ANALYST_API_URL` - Analyst API base URL
- `APP_API_URL` - App API base URL
- `NEO_X_RPC_URL` - Neo X RPC endpoint
- `ETHEREUM_RPC_URL` - Ethereum RPC endpoint

## Project Structure

```
├── public/
│   ├── index.html          # Homepage with Pitchforks branding
│   └── styles.css          # Dark theme styles
├── src/
│   ├── tools/              # MCP tools for ecosystem interaction
│   │   ├── ecosystem-overview.ts
│   │   ├── get-server-info.ts
│   │   ├── protocol-get-info.ts
│   │   ├── dex-get-info.ts
│   │   ├── dex-get-swap-quote.ts
│   │   ├── ferry-get-status.ts
│   │   ├── ferry-get-bridge-quote.ts
│   │   ├── analyst-get-overview.ts
│   │   └── app-get-info.ts
│   ├── prompts/            # Workflow templates
│   │   ├── ecosystem-guide.ts
│   │   ├── swap-guide.ts
│   │   └── bridge-guide.ts
│   ├── resources/          # Data feeds
│   │   ├── ecosystem-status.ts
│   │   ├── dex-prices.ts
│   │   └── ferry-status.ts
│   └── middleware.ts       # API key authentication
├── server.js               # Express + xmcp orchestration
├── xmcp.config.ts          # xmcp configuration
├── PITCHFORKS_MCP_RECOMMENDATIONS.md  # Backend API recommendations
└── package.json
```

## Development

### Running Locally
```bash
npm run build  # Compile TypeScript
npm start      # Start both servers
```

### Adding New Tools
1. Create a new file in `src/tools/`
2. Export `schema`, `metadata`, and default handler function
3. Run `npm run build`
4. Tool is automatically discovered

## Connecting to the Server

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "pitchforks-mcp": {
      "url": "https://[your-url]/mcp",
      "headers": {
        "x-api-key": "your-session-secret"
      }
    }
  }
}
```

## Current Status

**Mode**: Placeholder
- All tools return placeholder data
- Resources show mock values
- Ready for live API integration

**Next Steps**:
1. Connect Protocol API for governance data
2. Connect DEX API for prices and swaps
3. Connect Ferry API for bridge status
4. Build out Analyst API when site launches
5. Integrate App API for social features

See `PITCHFORKS_MCP_RECOMMENDATIONS.md` for detailed API requirements.

## Security Notes
- API key authentication protects the MCP endpoint
- SESSION_SECRET should be kept secure
- Homepage is publicly accessible (no auth required)
- All connections should use HTTPS in production

## Links
- [Pitchforks Protocol](https://protocol.pitchforks.social)
- [Pitchforks DEX](https://dex.pitchforks.social)
- [FerrymanX Bridge](https://ferry.pitchforks.social)
- [Pitchforks App](https://app.pitchforks.social)
- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
