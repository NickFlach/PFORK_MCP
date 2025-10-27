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
