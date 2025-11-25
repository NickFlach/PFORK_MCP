import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "dex-get-info",
  description: "Get information about Pitchforks DEX including trading pairs, liquidity pools, and token prices",
  annotations: {
    title: "DEX Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getDexInfo() {
  const baseUrl = process.env.DEX_API_URL || "https://dex.pitchforks.social";
  
  return {
    site: "dex.pitchforks.social",
    status: "placeholder",
    description: "Pitchforks DEX - Decentralized token exchange on Neo X",
    blockchain: "Neo X",
    contract: "0x62Cf7e56...cE62",
    features: {
      trading: "Token-to-token swaps",
      liquidity: "Liquidity pool management",
      prices: "Real-time price feeds"
    },
    endpoints: {
      pairs: `${baseUrl}/api/pairs`,
      price: `${baseUrl}/api/price/{token}`,
      pools: `${baseUrl}/api/pools`,
      swap: `${baseUrl}/api/swap/quote`,
      stats: `${baseUrl}/api/stats`
    },
    note: "This is a placeholder response. Connect the actual DEX API to get live data."
  };
}
