# MCP Server on Replit

A Model Context Protocol (MCP) server built with xmcp, featuring a beautiful homepage and API key authentication.

## Getting Started

1. **Click Run** - Start the server
2. **Prompt Agent for Functionality** - Ask the AI agent to add tools, prompts, or resources
3. **Test Changes** - View your changes on the homepage, use a tool like the [MCP inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test changes
4. **Click Deploy** - Publish your server to production. Settings will be pre-configured
5. **Connect** - Connect to your server with the dev command on the homepage. Servers have API key auth with the `SESSION_SECRET` value as the key—access it from secrets.

```json
{
  "mcpServers": {
    "my-replit-mcp-server": {
      "url": "https://[my-url.replit.app]/mcp",
      "headers": {
        "x-api-key": "your-session-secret"
      }
    }
  }
}
```

That's it! Your MCP server is ready to use.

## What You Get

- Custom homepage displaying all your tools, prompts, and resources
- API key authentication for secure access
- MCP protocol endpoint at `/mcp`
- Easy-to-extend architecture

## Documentation

- [xmcp Documentation](https://xmcp.dev/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Replit Docs](https://docs.replit.com)
