# xmcp MCP Server

This project is a Model Context Protocol (MCP) server built with [xmcp](https://xmcp.dev/), featuring API key authentication and a beautiful UI interface.

## Features

- ✅ **API Key Authentication** - Secure your MCP server with SESSION_SECRET
- ✅ **Beautiful UI** - Minimalist homepage using MCP UI
- ✅ **HTTP Transport** - Accessible over HTTP on port 5000
- ✅ **Auto-discovery** - Tools, prompts, and resources automatically registered

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

The server will start on `http://0.0.0.0:5000/mcp`

## Authentication

This server uses API key authentication. All requests to the `/mcp` endpoint require the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_SESSION_SECRET" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:5000/mcp \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
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
src/
├── middleware.ts          # API key authentication
├── tools/
│   ├── greet.ts          # Example greeting tool
│   └── homepage.ts       # UI homepage with server info
├── prompts/
│   └── review-code.ts    # Code review prompt template
└── resources/
    └── (config)/
        └── app.ts        # Application configuration
```

## Available Tools

### greet
Greet a user by name.

**Parameters:**
- `name` (string) - The name of the user to greet

### homepage
Display the MCP server homepage with endpoint information and available tools. Returns a beautiful, minimalist UI using MCP UI.

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

### Adding a Prompt

Create a new file in `src/prompts/`:

```typescript
import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  topic: z.string().describe("The topic"),
};

export const metadata: PromptMetadata = {
  name: "my-prompt",
  title: "My Prompt",
  description: "What your prompt does",
  role: "user",
};

export default function myPrompt({ topic }: InferSchema<typeof schema>) {
  return `Tell me about ${topic}`;
}
```

### Adding a Resource

Create a new file in `src/resources/`:

```typescript
import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "my-resource",
  title: "My Resource",
  description: "What your resource provides",
};

export default function handler() {
  return "Resource data here";
}
```

## Building for Production

```bash
npm run build
```

This compiles TypeScript to the `dist/` directory.

## Configuration

Server configuration is in `xmcp.config.ts`:

```typescript
const config: XmcpConfig = {
  http: {
    port: 5000,        // Port number
    host: "0.0.0.0",   // Bind to all interfaces
  },
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  }
};
```

## Learn More

- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP UI Documentation](https://mcpui.dev/)
- [xmcp Authentication Guide](https://xmcp.dev/docs/authentication/api-key)

## License

This project was created with [create-xmcp-app](https://github.com/basementstudio/xmcp).
