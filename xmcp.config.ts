import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    port: 3000,
    host: "0.0.0.0",
    endpoint: "/mcp",
    bodySizeLimit: 10485760, // 10MB
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "mcp-session-id",
        "mcp-protocol-version",
      ],
      exposedHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
      credentials: false,
      maxAge: 86400,
    },
    debug: false, // adds extra logging to the console
  },
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  }
};

export default config;
