# MCP on Replit

A clean, production-ready Model Context Protocol (MCP) server built with [xmcp](https://xmcp.dev/), featuring a beautiful homepage, API key authentication, and comprehensive examples for LLM coding agents.

## Features

- ✅ **Beautiful Homepage** - Clean, minimalist landing page with copy-to-clipboard functionality
- ✅ **API Key Authentication** - Secure your MCP server with SESSION_SECRET
- ✅ **Express Integration** - Dual-server architecture with full routing control
- ✅ **Comprehensive Examples** - Well-documented tools, prompts, and resources
- ✅ **Auto-discovery** - Components automatically registered from file system
- ✅ **LLM-Friendly** - Inline documentation and xmcp.dev links in every component

## Quick Start

### Prerequisites
- Node.js 20+
- SESSION_SECRET environment variable

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
- API endpoints at `/api/tools`, `/api/prompts`, `/api/resources`

## Architecture

```
┌─────────────────────────────────────┐
│   Express Server (Port 5000)        │
│   - Serves homepage at /            │
│   - Provides API endpoints          │
│   - Proxies /mcp to xmcp server     │
└──────────────┬──────────────────────┘
               │ proxies /mcp
               ▼
┌─────────────────────────────────────┐
│   xmcp Server (Port 3000)           │
│   - Handles MCP protocol            │
│   - API key authentication          │
│   - Auto-discovers components       │
└─────────────────────────────────────┘
```

## Project Structure

```
├── server.js              # Express server (port 5000)
├── public/
│   ├── index.html        # Homepage HTML
│   └── styles.css        # Separated CSS for easy customization
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
├── xmcp.config.ts        # xmcp server configuration
└── package.json          # Dependencies and scripts
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

## Adding New Components

All components include comprehensive inline documentation and links to xmcp.dev docs.

### Adding a Tool

Create a new file in `src/tools/your-tool.ts`:

```typescript
/**
 * Learn more: https://xmcp.dev/docs/core-concepts/tools
 */
import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";

export const schema = {
  input: z.string().describe("Your input parameter"),
};

export const metadata: ToolMetadata = {
  name: "your-tool",
  description: "What your tool does",
  annotations: {
    title: "Your Tool",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function yourTool({ input }: InferSchema<typeof schema>) {
  return `Result: ${input}`;
}
```

### Adding a Prompt

Create a new file in `src/prompts/your-prompt.ts`:

```typescript
/**
 * Learn more: https://xmcp.dev/docs/core-concepts/prompts
 */
import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  input: z.string().describe("Your input parameter"),
};

export const metadata: PromptMetadata = {
  name: "your-prompt",
  title: "Your Prompt",
  description: "What your prompt does",
  role: "user",
};

export default function yourPrompt({ input }: InferSchema<typeof schema>) {
  return `Your prompt text here: ${input}`;
}
```

### Adding a Resource

Create a new file in `src/resources/(scheme)/path.ts`:

```typescript
/**
 * Learn more: https://xmcp.dev/docs/core-concepts/resources
 */
import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "your-resource",
  title: "Your Resource",
  description: "What your resource provides",
};

export default function handler() {
  return "Your resource data here";
}
```

Then rebuild:
```bash
npm run build
npm start
```

## Authentication

All requests to `/mcp` require the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_SESSION_SECRET" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:5000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Customization

### Homepage
Edit `public/index.html` and `public/styles.css` to customize the landing page.

### Custom Routes
Edit `server.js` to add custom Express routes:

```javascript
// Add before the /mcp proxy
app.get('/custom', (req, res) => {
  res.json({ message: 'Custom route' });
});
```

## Learn More

- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Replit Documentation](https://docs.replit.com)
- [xmcp Authentication Guide](https://xmcp.dev/docs/authentication/api-key)
- [xmcp Tools Guide](https://xmcp.dev/docs/core-concepts/tools)
- [xmcp Prompts Guide](https://xmcp.dev/docs/core-concepts/prompts)
- [xmcp Resources Guide](https://xmcp.dev/docs/core-concepts/resources)

## License

This project was created with [create-xmcp-app](https://github.com/basementstudio/xmcp).
