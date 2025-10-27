# xmcp MCP Server

## Overview
This is a Model Context Protocol (MCP) server built with the xmcp TypeScript framework. It features a beautiful, minimalist homepage and API key authentication using the SESSION_SECRET environment variable.

## Current Features

### Beautiful Homepage
- **Custom Landing Page**: Clean, minimalist design displayed at the root URL (/)
- **Copy-to-Clipboard**: Easy copying of MCP endpoint URL
- **Responsive Design**: Works on desktop and mobile devices
- **Tool Listing**: Shows all available tools with descriptions

### Authentication
- **API Key Authentication**: Enabled using `SESSION_SECRET` environment variable
- All requests to `/mcp` endpoint require `x-api-key` header
- Unauthorized requests receive a 401 error

### Available Tools
1. **greet** - Greet a user by name
2. **homepage** - Display server homepage with information (MCP UI resource)

### Server Architecture
- **Express Server (Port 5000)**: Serves custom homepage and proxies MCP requests
- **xmcp Server (Port 3001)**: Handles MCP protocol requests with authentication
- **Endpoint**: `/mcp`
- **Protocol**: HTTP transport

## Recent Changes

### 2025-10-27: Custom Homepage Implementation
- Created Express wrapper to serve custom homepage at root URL
- Implemented beautiful, minimalist design inspired by modern web aesthetics
- Set up proxy to route /mcp requests to xmcp server
- Maintained API key authentication for MCP endpoint
- Configured dual-server architecture (Express on 5000, xmcp on 3001)

### 2025-10-27: Initial Setup
- Configured API key authentication middleware using SESSION_SECRET
- Created homepage tool with MCP UI integration
- Set up production workflow

## Project Architecture

### File Structure
```
├── server.js              # Express wrapper serving homepage & proxy
├── src/
│   ├── middleware.ts      # API key authentication for MCP
│   ├── tools/
│   │   ├── greet.ts      # Example greeting tool
│   │   └── homepage.ts   # UI homepage tool (MCP UI)
│   ├── prompts/
│   │   └── review-code.ts # Code review prompt
│   └── resources/
│       └── (config)/
│           └── app.ts    # App config resource
├── xmcp.config.ts        # xmcp server configuration
└── package.json          # Dependencies and scripts
```

### Configuration Files
- `server.js` - Express server with custom homepage and MCP proxy
- `xmcp.config.ts` - xmcp server configuration (port 3001, paths)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### How It Works

1. **Express Server (Port 5000)**:
   - Serves custom HTML homepage at `/`
   - Proxies all `/mcp` requests to xmcp server
   - Public-facing server

2. **xmcp Server (Port 3001)**:
   - Runs in background via `server.js`
   - Handles MCP protocol requests
   - Enforces API key authentication
   - Auto-discovers tools, prompts, resources

## Connecting to This Server

### From Web Browser
Visit your Replit URL to see the beautiful homepage with:
- MCP endpoint URL
- Available tools
- Configuration examples
- Documentation links

### MCP Client Configuration
Add this to your MCP client configuration file:

```json
{
  "mcpServers": {
    "my-xmcp-app": {
      "url": "https://<your-replit-domain>/mcp",
      "headers": {
        "x-api-key": "<your-session-secret>"
      }
    }
  }
}
```

Replace `<your-replit-domain>` with your Replit development domain and `<your-session-secret>` with the SESSION_SECRET environment variable value.

### Testing Locally
```bash
# Test homepage
curl http://localhost:5000/

# Test MCP endpoint
curl -H "x-api-key: <your-session-secret>" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -X POST http://localhost:5000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Development

### Running the Server
```bash
npm run dev       # Development mode with hot reload
npm run build     # Build for production
npm start         # Run production server (Express + xmcp)
```

### Adding New Tools
1. Create a new file in `src/tools/`
2. Export schema, metadata, and default handler function
3. Run `npm run build`
4. Restart the server
5. Tool is automatically discovered and registered

### Modifying the Homepage
Edit `server.js` and update the `homepageHtml` constant with your custom HTML/CSS.

## User Preferences
- Clean, minimalist design aesthetic
- Secure API key authentication
- Beautiful UI at root URL for easy access
- MCP UI for interactive tool interfaces

## Technology Stack
- **Framework**: xmcp (TypeScript MCP framework)
- **Web Server**: Express.js
- **Runtime**: Node.js 20+
- **Protocol**: Model Context Protocol (MCP)
- **UI**: MCP UI for interface resources
- **Validation**: Zod for schema validation
- **Proxy**: http-proxy-middleware for routing

## Security Notes
- API key authentication protects the MCP endpoint
- SESSION_SECRET should be kept secure and never committed to version control
- Homepage is publicly accessible (no auth required)
- All connections should use HTTPS in production
- MCP endpoint requires authentication for all operations

## Links
- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP UI](https://mcpui.dev/)
