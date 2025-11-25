import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "analyst-get-overview",
  description: "Get an overview of Pitchforks ecosystem analytics including market data, whale movements, and ecosystem health",
  annotations: {
    title: "Analyst Overview",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getAnalystOverview() {
  const baseUrl = process.env.ANALYST_API_URL || "https://analyst.pitchforks.social";
  
  return {
    site: "analyst.pitchforks.social",
    status: "coming_soon",
    description: "Pitchforks Analyst - Analytics and data tools for the ecosystem",
    plannedFeatures: {
      portfolio: "Portfolio analysis for any wallet address",
      tokenAnalytics: "Detailed metrics for ecosystem tokens",
      whaleTracking: "Monitor large wallet movements",
      sentiment: "Market sentiment analysis",
      healthScore: "Overall ecosystem health metrics",
      reports: "Comprehensive generated reports"
    },
    endpoints: {
      portfolio: `${baseUrl}/api/analyze/portfolio`,
      token: `${baseUrl}/api/analytics/token/{address}`,
      whales: `${baseUrl}/api/whales`,
      sentiment: `${baseUrl}/api/sentiment`,
      health: `${baseUrl}/api/health`,
      history: `${baseUrl}/api/history/{token}`,
      reports: `${baseUrl}/api/reports/generate`
    },
    note: "The Analyst site is currently under development. These endpoints are planned but not yet available."
  };
}
