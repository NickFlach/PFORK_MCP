/**
 * Resource: Application Configuration
 * 
 * This is a static resource that provides application configuration data.
 * Resources are read-only data sources that provide context to AI models.
 * 
 * Resources can be:
 * - Static: No parameters needed (like this one)
 * - Dynamic: Accept parameters to customize output
 * 
 * URI format is derived from folder structure:
 * - Folders with parentheses (config) become URI schemes: config://
 * - Folders with brackets [param] become dynamic parameters
 * 
 * This resource creates: config://app
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/resources
 * 
 * To create a new resource:
 * - Create a file in src/resources/ with appropriate folder structure
 * - Export metadata and a default handler function
 * - Run `npm run build` to compile
 * - The resource is automatically discovered and registered
 */

import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "app-config",
  title: "Application Configuration",
  description: "Configuration data for this xmcp MCP server",
};

export default function handler() {
  return {
    serverName: "xmcp MCP Server",
    framework: "xmcp",
    language: "TypeScript",
    transport: "HTTP",
    features: {
      authentication: "API Key (SESSION_SECRET)",
      hotReload: "Enabled in development",
      autoDiscovery: "Tools, prompts, and resources auto-registered from file system",
    },
    endpoints: {
      mcp: "/mcp",
      homepage: "/",
      tools: "/api/tools",
      prompts: "/api/prompts",
      resources: "/api/resources",
    },
    documentation: {
      xmcp: "https://xmcp.dev/docs",
      mcp: "https://modelcontextprotocol.io/",
      repository: "See package.json for details",
    },
  };
}
