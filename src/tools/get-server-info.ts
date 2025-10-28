/**
 * Tool: Get Server Information
 * 
 * Returns information about this MCP server, including available tools,
 * prompts, and resources. Useful for LLMs to understand server capabilities.
 * 
 * This demonstrates a read-only tool that provides context without external dependencies.
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/tools
 */

import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "get-server-info",
  description: "Get information about this MCP server's capabilities and structure",
  annotations: {
    title: "Server Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getServerInfo() {
  return {
    name: "xmcp MCP Server",
    framework: "xmcp",
    version: "0.1.0",
    description: "Model Context Protocol server built with the xmcp TypeScript framework",
    capabilities: {
      tools: "Functions that LLMs can call to perform actions",
      prompts: "Reusable instruction templates for consistent interactions",
      resources: "Read-only data sources providing context to AI models",
    },
    structure: {
      tools: "src/tools/ - Auto-discovered tool definitions",
      prompts: "src/prompts/ - Auto-discovered prompt templates",
      resources: "src/resources/ - Auto-discovered resource providers",
      middleware: "src/middleware.ts - Authentication and request processing",
      config: "xmcp.config.ts - Server configuration",
    },
    documentation: {
      xmcp: "https://xmcp.dev/docs",
      mcp: "https://modelcontextprotocol.io/",
      tools: "https://xmcp.dev/docs/core-concepts/tools",
      prompts: "https://xmcp.dev/docs/core-concepts/prompts",
      resources: "https://xmcp.dev/docs/core-concepts/resources",
    },
  };
}
