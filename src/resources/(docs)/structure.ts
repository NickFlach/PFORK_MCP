/**
 * Resource: Project Structure
 * 
 * This static resource provides documentation about the project structure.
 * Useful for LLMs to understand how the codebase is organized.
 * 
 * URI: docs://structure
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/resources
 */

import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "project-structure",
  title: "Project Structure",
  description: "Documentation about the project's file structure and organization",
};

export default function handler() {
  return `# Project Structure

This xmcp MCP server follows a convention-based structure:

## Core Directories

### src/tools/
Tools are executable functions that LLMs can call to perform actions.
- Each file exports: schema, metadata, and a default handler function
- Auto-discovered and registered by xmcp
- Examples: API calls, database queries, file operations
- Documentation: https://xmcp.dev/docs/core-concepts/tools

### src/prompts/
Prompts are reusable instruction templates for consistent LLM interactions.
- Each file exports: schema, metadata, and a default handler function
- Enable parameterized, structured workflows
- Examples: Code review, documentation generation, debugging
- Documentation: https://xmcp.dev/docs/core-concepts/prompts

### src/resources/
Resources provide read-only data to AI models.
- Static resources: No parameters needed
- Dynamic resources: Accept parameters via [brackets] in folder names
- URI derived from folder structure
- Examples: Config data, user profiles, documentation
- Documentation: https://xmcp.dev/docs/core-concepts/resources

## Configuration Files

### xmcp.config.ts
Server configuration including:
- HTTP/STDIO transport settings
- Port and endpoint configuration
- Custom directory paths (optional)
- Middleware configuration

### src/middleware.ts
Authentication and request processing:
- API key authentication
- Custom request/response handling
- Security and validation logic

## Project Files

### server.js
Express wrapper that:
- Serves custom homepage at /
- Provides API endpoints for tools, prompts, resources
- Proxies /mcp requests to xmcp server
- Manages dual-server architecture (Express on 5000, xmcp on 3000)

### public/
Static files for the homepage:
- index.html: Homepage HTML
- styles.css: Separated CSS for easy customization

## How It Works

1. **File-System Routing**: Tools, prompts, and resources are auto-discovered
2. **Hot Reload**: Changes update instantly in development
3. **Type Safety**: Full TypeScript + Zod validation
4. **Zero Config**: Works immediately with sensible defaults

## Adding New Components

### New Tool:
1. Create file in src/tools/your-tool.ts
2. Export schema, metadata, and handler
3. Run npm run build
4. Tool is automatically registered

### New Prompt:
1. Create file in src/prompts/your-prompt.ts
2. Export schema, metadata, and handler
3. Run npm run build
4. Prompt is automatically registered

### New Resource:
1. Create file in src/resources/(scheme)/path.ts
2. Use [param] folders for dynamic parameters
3. Export metadata and handler
4. Run npm run build
5. Resource is automatically registered

## Learn More

- xmcp Documentation: https://xmcp.dev/docs
- MCP Specification: https://modelcontextprotocol.io/
- GitHub: https://github.com/basementstudio/xmcp
`;
}
