# xmcp MCP Server

## Overview
This is a Model Context Protocol (MCP) server built with the xmcp TypeScript framework. It features a beautiful, minimalist homepage served from a static HTML file and API key authentication using the SESSION_SECRET environment variable.

## Current Features

### Beautiful Homepage
- **Static HTML File**: Clean, minimalist design at `public/index.html`
- **External CSS**: Styles separated into `public/styles.css` for easy customization
- **Dynamic URL Generation**: JavaScript automatically detects domain and generates endpoint URL
- **Copy-to-Clipboard**: Easy copying of MCP endpoint URL and configuration JSON
- **Responsive Design**: Works on desktop and mobile devices
- **Comprehensive Listings**: Shows all available tools, prompts, and resources with descriptions
- **Documentation Links**: Direct links to xmcp docs for tools, prompts, and resources concepts
- **API Endpoints**: Provides `/api/tools`, `/api/prompts`, and `/api/resources` for dynamic loading

### Authentication
- **API Key Authentication**: Enabled using `SESSION_SECRET` environment variable
- All requests to `/mcp` endpoint require `x-api-key` header
- Unauthorized requests receive a 401 error

### Available Tools
1. **greet** - Simple example tool that greets a user by name
2. **get-server-info** - Returns comprehensive server information and capabilities

All tools include inline documentation with links to xmcp documentation.

### Server Architecture
- **Express Server (Port 5000)**: Serves custom homepage and proxies MCP requests
- **xmcp Server (Port 3000)**: Handles MCP protocol requests with authentication
- **Endpoint**: `/mcp`
- **Protocol**: HTTP transport

## Recent Changes

### 2025-10-28: Optimized API Endpoints to Query MCP Server Directly
- Refactored `/api/tools`, `/api/prompts`, and `/api/resources` to use MCP protocol
- API endpoints now query the running xmcp server instead of manually scanning files
- Uses MCP JSON-RPC methods: `tools/list`, `prompts/list`, `resources/list`
- Cleaner implementation that leverages the MCP server's built-in capabilities
- Authenticates internal requests using SESSION_SECRET

### 2025-10-28: Updated Branding & Documentation Links
- Changed homepage title to "MCP on Replit" with inline Replit logo
- Added Replit Docs link to documentation section
- Enhanced visual branding with logo integration

### 2025-10-28: Simplified Project Structure
- Removed @mcp-ui/server dependency (not needed)
- Simplified middleware.ts to only handle API key authentication
- Simplified xmcp.config.ts to minimal necessary configuration
- Cleaned up project to be a clean boilerplate template
- Updated documentation to reflect simplified structure

### 2025-10-28: Enhanced Examples & Documentation for LLM Agents
- Updated all tools, prompts, and resources with comprehensive inline documentation
- Added documentation links to xmcp.dev in all component files
- Created better example tools: greet, get-server-info
- Created better example prompts: review-code (enhanced), generate-docs, debug-error
- Created better example resources: app-config, user-profile, project-structure
- Fixed alignment and spacing issues on homepage (section headers with docs links)
- All components now include clear instructions for LLM coding agents

### 2025-10-28: Enhanced Homepage with Prompts & Resources
- Added prompts and resources listings to homepage
- Created `/api/prompts` endpoint to dynamically load available prompts
- Created `/api/resources` endpoint to recursively scan and list resources
- Removed MCP UI links from documentation section
- Homepage now displays complete server capabilities (tools, prompts, resources)

### 2025-10-28: Clean Architecture & Static HTML
- Moved homepage HTML to separate file (`public/index.html`)
- Simplified server.js to focus on routing
- Made URL generation dynamic using JavaScript
- Configured proper port mapping (Express on 5000, xmcp on 3000)
- Cleaned up project structure

### 2025-10-27: Custom Homepage Implementation
- Created Express wrapper to serve custom homepage at root URL
- Implemented beautiful, minimalist design inspired by modern web aesthetics
- Set up proxy to route /mcp requests to xmcp server
- Maintained API key authentication for MCP endpoint
- Configured dual-server architecture

### 2025-10-27: Initial Setup
- Configured API key authentication middleware using SESSION_SECRET
- Created homepage tool with MCP UI integration
- Set up production workflow

## Project Architecture

### File Structure
```
├── server.js              # Express server (port 5000)
├── public/
│   ├── index.html        # Homepage HTML
│   └── styles.css        # Homepage CSS
├── src/
│   ├── middleware.ts     # API key authentication
│   ├── tools/
│   │   ├── greet.ts              # Example greeting tool
│   │   └── get-server-info.ts   # Server information tool
│   ├── prompts/
│   │   ├── review-code.ts        # Enhanced code review prompt
│   │   ├── generate-docs.ts      # Documentation generation prompt
│   │   └── debug-error.ts        # Error debugging prompt
│   └── resources/
│       ├── (config)/
│       │   └── app.ts            # App config resource
│       ├── (users)/
│       │   └── [userId]/
│       │       └── index.ts      # User profile resource
│       └── (docs)/
│           └── structure.ts      # Project structure resource
├── xmcp.config.ts        # xmcp server configuration (port 3000)
└── package.json          # Dependencies and scripts
```

### Configuration Files
- `server.js` - Express server serving homepage and proxying MCP requests
- `public/index.html` - Static homepage HTML
- `public/styles.css` - Separated CSS for easy customization
- `xmcp.config.ts` - xmcp server configuration (simplified, minimal settings)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### How It Works

1. **Express Server (Port 5000)**:
   - Serves `public/index.html` at `/`
   - Provides API endpoints: `/api/tools`, `/api/prompts`, `/api/resources`
     - These endpoints query the xmcp server using MCP protocol internally
     - Uses JSON-RPC methods: `tools/list`, `prompts/list`, `resources/list`
   - Proxies all `/mcp` requests to xmcp server on port 3000
   - Public-facing server

2. **xmcp Server (Port 3000)**:
   - Runs in background via `server.js`
   - Handles MCP protocol requests
   - Enforces API key authentication
   - Auto-discovers tools, prompts, resources
   - Responds to internal queries from Express API endpoints

3. **Homepage (`public/index.html`)**:
   - Pure HTML/CSS/JavaScript
   - No server-side rendering needed
   - JavaScript dynamically generates URLs based on `window.location.origin`
   - Easy to customize and maintain

## Connecting to This Server

### From Web Browser
Visit your Replit URL to see the beautiful homepage with:
- MCP endpoint URL
- Available tools with descriptions
- Available prompts with descriptions
- Available resources with descriptions
- Configuration examples
- Documentation links (xmcp and MCP Spec)

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
Edit `public/index.html` - no rebuild required! Just refresh the browser.

### Adding Custom Routes
Edit `server.js` and add routes before the `/mcp` proxy:

```javascript
app.get('/custom', (req, res) => {
  res.json({ message: 'Custom route' });
});
```

## User Preferences
- Clean, minimalist design aesthetic
- Secure API key authentication
- Beautiful UI at root URL for easy access
- MCP UI for interactive tool interfaces
- Static files for easy customization

## Technology Stack
- **Framework**: xmcp (TypeScript MCP framework)
- **Web Server**: Express.js
- **Runtime**: Node.js 20+
- **Protocol**: Model Context Protocol (MCP)
- **UI**: MCP UI for interface resources
- **Validation**: Zod for schema validation
- **Proxy**: http-proxy-middleware for routing

## Port Configuration
- **Port 5000**: Express server (public-facing)
  - Serves homepage at `/`
  - Proxies `/mcp` to xmcp server
- **Port 3000**: xmcp server (internal)
  - Handles MCP protocol
  - Requires authentication

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
