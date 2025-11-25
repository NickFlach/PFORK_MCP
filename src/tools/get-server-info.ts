import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "get-server-info",
  description: "Get information about this Pitchforks MCP server's capabilities and structure",
  annotations: {
    title: "Server Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getServerInfo() {
  return {
    name: "Pitchforks MCP Server",
    framework: "xmcp",
    version: "1.0.0",
    description: "Model Context Protocol server for the Pitchforks ecosystem - decentralized tools for peaceful resistance",
    ecosystem: {
      protocol: "protocol.pitchforks.social - Governance & Whitepaper",
      dex: "dex.pitchforks.social - Token Trading on Neo X",
      ferry: "ferry.pitchforks.social - Cross-chain Bridge (ETH ⇋ Neo X)",
      analyst: "analyst.pitchforks.social - Analytics (Coming Soon)",
      app: "app.pitchforks.social - Social Network"
    },
    capabilities: {
      tools: "Functions for interacting with Pitchforks ecosystem sites",
      prompts: "Reusable templates for common Pitchforks workflows",
      resources: "Real-time data feeds from ecosystem sites"
    },
    structure: {
      tools: "src/tools/ - Ecosystem interaction tools",
      prompts: "src/prompts/ - Workflow templates",
      resources: "src/resources/ - Data feeds",
      config: "xmcp.config.ts - Server configuration"
    },
    documentation: {
      pitchforks: "https://pitchforks.social",
      xmcp: "https://xmcp.dev/docs",
      mcp: "https://modelcontextprotocol.io/"
    },
    status: "placeholder_mode",
    note: "Tools currently return placeholder data. Connect ecosystem APIs for live functionality."
  };
}
