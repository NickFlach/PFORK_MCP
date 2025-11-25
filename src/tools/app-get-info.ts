import { type ToolMetadata } from "xmcp";

export const metadata: ToolMetadata = {
  name: "app-get-info",
  description: "Get information about the Pitchforks social network app including features, memberships, and API endpoints",
  annotations: {
    title: "App Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getAppInfo() {
  const baseUrl = process.env.APP_API_URL || "https://app.pitchforks.social/api/v3";
  
  return {
    site: "app.pitchforks.social",
    status: "placeholder",
    description: "Pitchforks App - Social network powered by Minds Networks",
    platform: "Minds Networks",
    features: {
      social: "Content posting and feeds",
      memberships: "Tiered membership system",
      wallet: "Integrated crypto wallet",
      tokens: "Token earning and rewards"
    },
    memberships: [
      {
        name: "Shinobi Oasis",
        price: "$60/month",
        description: "Built for ninja. Enjoy the Oasis. Find your tools."
      }
    ],
    endpoints: {
      users: `${baseUrl}/users/{handle}`,
      feed: `${baseUrl}/users/{handle}/feed`,
      trending: `${baseUrl}/trending`,
      search: `${baseUrl}/search`,
      memberships: `${baseUrl}/memberships`,
      wallet: `${baseUrl}/wallet/{address}`,
      posts: `${baseUrl}/posts`,
      notifications: `${baseUrl}/notifications`
    },
    note: "This is a placeholder response. Connect the actual App API to get live data."
  };
}
