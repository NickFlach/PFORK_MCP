import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "ecosystem-overview",
  description: "Get a comprehensive overview of the entire Pitchforks ecosystem including all sites, their status, and key metrics",
  annotations: {
    title: "Ecosystem Overview",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getEcosystemOverview() {
  return {
    name: "Pitchforks Ecosystem",
    tagline: "Decentralized tools for peaceful resistance against corruption and injustice",
    blockchain: "Neo X (with Ethereum bridge)",
    sites: [
      {
        name: "Protocol",
        domain: "protocol.pitchforks.social",
        status: "live",
        purpose: "Core governance and whitepaper",
        description: "The foundation of Pitchforks - governance proposals, voting, and protocol documentation"
      },
      {
        name: "DEX",
        domain: "dex.pitchforks.social",
        status: "live",
        purpose: "Token trading",
        description: "Decentralized exchange for trading ecosystem tokens on Neo X",
        contract: "0x62Cf7e56...cE62"
      },
      {
        name: "Ferry (FerrymanX)",
        domain: "ferry.pitchforks.social",
        status: "live",
        purpose: "Cross-chain bridge",
        description: "Bridge tokens between Ethereum and Neo X seamlessly"
      },
      {
        name: "Analyst",
        domain: "analyst.pitchforks.social",
        status: "coming_soon",
        purpose: "Analytics and data",
        description: "Portfolio analysis, whale tracking, sentiment analysis, and ecosystem health metrics"
      },
      {
        name: "App",
        domain: "app.pitchforks.social",
        status: "live",
        purpose: "Social network",
        description: "Community platform powered by Minds Networks with memberships and token integration"
      },
      {
        name: "Root",
        domain: "pitchforks.social",
        status: "live",
        purpose: "Main portal",
        description: "Landing page and entry point to the ecosystem"
      }
    ],
    links: {
      protocol: "https://protocol.pitchforks.social",
      dex: "https://dex.pitchforks.social",
      ferry: "https://ferry.pitchforks.social",
      analyst: "https://analyst.pitchforks.social",
      app: "https://app.pitchforks.social",
      root: "https://pitchforks.social"
    },
    mcpServer: {
      version: "1.0.0",
      status: "placeholder_mode",
      note: "Currently returning placeholder data. Connect the ecosystem APIs to enable live functionality."
    }
  };
}
