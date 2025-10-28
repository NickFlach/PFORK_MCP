/**
 * xmcp Server Configuration
 * 
 * This file configures the xmcp MCP server settings.
 * The server runs on port 3000 and is proxied by Express on port 5000.
 * 
 * Learn more: https://xmcp.dev/docs/configuration
 */

import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    port: 3000,
    host: "0.0.0.0",
    endpoint: "/mcp",
  },
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  }
};

export default config;
