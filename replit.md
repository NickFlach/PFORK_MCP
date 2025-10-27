# xmcp MCP Server

## Overview
This is a Model Context Protocol (MCP) server built with the xmcp TypeScript framework. It provides AI tools and resources through a standardized protocol with built-in API key authentication.

## Current Features

### Authentication
- **API Key Authentication**: Enabled using `SESSION_SECRET` environment variable
- All requests to `/mcp` endpoint require `x-api-key` header
- Unauthorized requests receive a 401 error

### Available Tools
1. **greet** - Greet a user by name
2. **homepage** - Display a beautiful, minimalist UI homepage with server information (MCP UI resource)

### Server Configuration
- **Port**: 5000
- **Host**: 0.0.0.0 (accessible externally)
- **Endpoint**: `/mcp`
- **Protocol**: HTTP transport

## Recent Changes

### 2025-10-27: Initial Setup
- Configured API key authentication middleware using SESSION_SECRET
- Created homepage tool with MCP UI integration for beautiful interface
- Configured server to run on port 5000 with external access
- Set up production workflow

## Project Architecture

### File Structure
```
src/
├── middleware.ts          # API key authentication
├── tools/
│   ├── greet.ts          # Example greeting tool
│   └── homepage.ts       # UI homepage tool (MCP UI)
├── prompts/
│   └── review-code.ts    # Code review prompt
└── resources/
    └── (config)/
        └── app.ts        # App config resource
```

### Configuration Files
- `xmcp.config.ts` - Server configuration (port, host, paths)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Connecting to This Server

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
curl -H "x-api-key: <your-session-secret>" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:5000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Development

### Running the Server
```bash
npm run dev       # Development mode with hot reload
npm run build     # Build for production
npm start         # Run production server
```

### Adding New Tools
1. Create a new file in `src/tools/`
2. Export schema, metadata, and default handler function
3. Rebuild the project
4. Tool is automatically discovered and registered

### Adding Authentication
Authentication is already configured using the SESSION_SECRET environment variable. All MCP endpoint requests require the `x-api-key` header.

## User Preferences
- Clean, minimalist design aesthetic
- Secure API key authentication
- MCP UI for beautiful interfaces

## Technology Stack
- **Framework**: xmcp (TypeScript MCP framework)
- **Runtime**: Node.js 20+
- **Protocol**: Model Context Protocol (MCP)
- **UI**: MCP UI for interface resources
- **Validation**: Zod for schema validation

## Security Notes
- API key authentication protects the MCP endpoint
- SESSION_SECRET should be kept secure and never committed to version control
- All connections should use HTTPS in production

## Links
- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP UI](https://mcpui.dev/)
