import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    port: 5000,
    host: "0.0.0.0",
  },
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  }
};

export default config;
