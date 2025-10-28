/**
 * Authentication Middleware
 * 
 * This middleware protects the MCP endpoint with API key authentication.
 * Clients must include the SESSION_SECRET in the x-api-key header.
 * 
 * Learn more: https://xmcp.dev/docs/authentication/api-key
 */

import { apiKeyAuthMiddleware, type Middleware } from "xmcp";

const middleware: Middleware = apiKeyAuthMiddleware({
  headerName: "x-api-key",
  validateApiKey: async (apiKey) => {
    const sessionSecret = process.env.SESSION_SECRET;
    
    if (!sessionSecret) {
      console.error("SESSION_SECRET environment variable is not set");
      return false;
    }
    
    return apiKey === sessionSecret;
  },
});

export default middleware;
