import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  uri: "pitchforks://ecosystem/status",
  name: "Ecosystem Status",
  description: "Real-time status of all Pitchforks ecosystem sites",
  mimeType: "application/json",
};

export default async function getEcosystemStatus() {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    status: "placeholder",
    sites: {
      "protocol.pitchforks.social": {
        status: "online",
        lastCheck: new Date().toISOString()
      },
      "dex.pitchforks.social": {
        status: "online",
        lastCheck: new Date().toISOString()
      },
      "ferry.pitchforks.social": {
        status: "online",
        lastCheck: new Date().toISOString()
      },
      "analyst.pitchforks.social": {
        status: "coming_soon",
        lastCheck: new Date().toISOString()
      },
      "app.pitchforks.social": {
        status: "online",
        lastCheck: new Date().toISOString()
      }
    },
    note: "This is placeholder data. Connect health check endpoints for live status."
  }, null, 2);
}
