# xmcp MCP Server

This project is a Model Context Protocol (MCP) server built with [xmcp](https://xmcp.dev/), featuring API key authentication and a beautiful minimalist homepage.

## Features

- ✅ **Beautiful Homepage** - Clean, minimalist landing page at the root URL
- ✅ **API Key Authentication** - Secure your MCP server with SESSION_SECRET
- ✅ **Express Integration** - Full control over routing and middleware
- ✅ **HTTP Transport** - Accessible over HTTP on port 5000
- ✅ **MCP UI Integration** - Build interactive interfaces with MCP UI
- ✅ **Auto-discovery** - Tools, prompts, and resources automatically registered

## Architecture

This project uses a clean architecture with Express as the main server:

```
┌─────────────────────────────────────┐
│   Express Server (Port 5000)        │
│   - Serves homepage at /            │
│   - Proxies /mcp to xmcp server     │
│   - Full routing control            │
└──────────────┬──────────────────────┘
               │ proxies /mcp
               ▼
┌─────────────────────────────────────┐
│   xmcp Server (Port 3000)           │
│   - Handles MCP protocol            │
│   - API key authentication          │
│   - Auto-discovers tools            │
└─────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 20+
- SESSION_SECRET environment variable (already configured in Replit)

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://0.0.0.0:5000` with:
- Homepage at `/`
- MCP endpoint at `/mcp`

## Authentication

This server uses API key authentication. All requests to the `/mcp` endpoint require the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_SESSION_SECRET" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -X POST http://localhost:5000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Connecting to MCP Clients

Add this configuration to your MCP client (Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "my-xmcp-app": {
      "url": "https://YOUR_REPLIT_DOMAIN/mcp",
      "headers": {
        "x-api-key": "YOUR_SESSION_SECRET"
      }
    }
  }
}
```

## Project Structure

```
├── server.js              # Express server (port 5000)
├── public/
│   └── index.html        # Homepage (served at /)
├── src/
│   ├── middleware.ts      # API key authentication
│   ├── tools/
│   │   ├── greet.ts      # Example greeting tool
│   │   └── homepage.ts   # UI homepage tool (MCP UI)
│   ├── prompts/
│   │   └── review-code.ts # Code review prompt
│   └── resources/
│       └── (config)/
│           └── app.ts    # Application configuration
├── xmcp.config.ts        # xmcp configuration (port 3000)
└── package.json
```

## Available Tools

### greet
Greet a user by name.

**Parameters:**
- `name` (string) - The name of the user to greet

### homepage
Display the MCP server homepage with endpoint information and available tools. Returns a beautiful, minimalist UI using MCP UI.

## Customizing the Homepage

The homepage is located at `public/index.html`. Edit this file to customize the design. The JavaScript automatically:
- Detects the current domain
- Generates the MCP endpoint URL
- Updates the configuration example

## Adding New Components

### Adding a Tool

Create a new file in `src/tools/`:

```typescript
import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";

export const schema = {
  input: z.string().describe("Your input parameter"),
};

export const metadata: ToolMetadata = {
  name: "my-tool",
  description: "What your tool does",
};

export default function myTool({ input }: InferSchema<typeof schema>) {
  return `Result: ${input}`;
}
```

Then rebuild:
```bash
npm run build
npm start
```

### Adding Custom Routes

Edit `server.js` to add your own routes:

```javascript
// Add this before the /mcp proxy
app.get('/your-route', (req, res) => {
  res.json({ message: 'Your custom route' });
});
```

## Configuration

### Express Server (`server.js`)
- Port: 5000 (public-facing)
- Serves homepage from `public/index.html`
- Proxies `/mcp` to xmcp server on port 3000

### xmcp Configuration (`xmcp.config.ts`)
```typescript
const config: XmcpConfig = {
  http: {
    port: 3000,           // Internal xmcp server port
    host: "0.0.0.0",
    endpoint: "/mcp",
  },
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  }
};
```

## Building for Production

```bash
npm run build
```

This compiles TypeScript to the `dist/` directory.

## Learn More

- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP UI Documentation](https://mcpui.dev/)
- [xmcp Authentication Guide](https://xmcp.dev/docs/authentication/api-key)

## License

This project was created with [create-xmcp-app](https://github.com/basementstudio/xmcp).
