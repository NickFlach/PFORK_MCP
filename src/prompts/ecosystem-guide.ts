import { type PromptMetadata } from "xmcp";

export const metadata: PromptMetadata = {
  name: "ecosystem-guide",
  title: "Ecosystem Guide",
  description: "A comprehensive guide to navigating the Pitchforks ecosystem",
};

export default async function ecosystemGuide() {
  return `# Pitchforks Ecosystem Guide

Welcome to the Pitchforks ecosystem - decentralized tools for peaceful resistance against corruption and injustice.

## Available Sites

### 1. Protocol (protocol.pitchforks.social)
The foundation of Pitchforks. Here you'll find:
- Governance proposals and voting
- The whitepaper explaining the protocol
- Token information and statistics

Use the \`protocol-get-info\` tool to explore.

### 2. DEX (dex.pitchforks.social)
Decentralized exchange on Neo X:
- Swap tokens directly
- Provide liquidity to earn fees
- View real-time prices

Use \`dex-get-info\` and \`dex-get-swap-quote\` tools.

### 3. Ferry / FerrymanX (ferry.pitchforks.social)
Cross-chain bridge between Ethereum and Neo X:
- Bridge tokens between chains
- Track bridge transactions
- View current fees and estimated times

Use \`ferry-get-status\` and \`ferry-get-bridge-quote\` tools.

### 4. Analyst (analyst.pitchforks.social)
Analytics platform (coming soon):
- Portfolio analysis
- Whale tracking
- Sentiment analysis
- Ecosystem health metrics

Use \`analyst-get-overview\` to see planned features.

### 5. App (app.pitchforks.social)
Social network powered by Minds:
- Community engagement
- Content creation
- Membership tiers
- Wallet integration

Use \`app-get-info\` tool to explore.

## Getting Started

1. Start with \`ecosystem-overview\` to see all available sites
2. Use site-specific tools to get detailed information
3. Check resources like \`pitchforks://ecosystem/status\` for live data

## Need Help?

Ask me about any specific feature or site, and I'll guide you through it.`;
}
