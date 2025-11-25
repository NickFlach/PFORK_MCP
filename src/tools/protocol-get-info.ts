import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "protocol-get-info",
  description: "Get information about Pitchfork Protocol including governance, whitepaper, and protocol statistics",
  annotations: {
    title: "Protocol Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getProtocolInfo() {
  const baseUrl = process.env.PROTOCOL_API_URL || "https://protocol.pitchforks.social";
  
  return {
    site: "protocol.pitchforks.social",
    status: "placeholder",
    description: "Pitchfork Protocol - Decentralized tools for peaceful resistance against corruption and injustice",
    blockchain: "Neo X",
    features: {
      governance: "Community-driven proposal and voting system",
      whitepaper: "Comprehensive documentation of the protocol",
      tokenomics: "NEO token integration"
    },
    endpoints: {
      whitepaper: `${baseUrl}/api/whitepaper`,
      proposals: `${baseUrl}/api/governance/proposals`,
      stats: `${baseUrl}/api/stats`,
      token: `${baseUrl}/api/token`
    },
    note: "This is a placeholder response. Connect the actual Protocol API to get live data."
  };
}
