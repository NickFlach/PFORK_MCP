import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";

export const schema = {
  token: z.string().describe("The token address or symbol to bridge"),
  amount: z.string().describe("The amount to bridge (in base units)"),
  direction: z.enum(["eth-to-neox", "neox-to-eth"]).describe("The direction of the bridge transfer")
};

export const metadata: ToolMetadata = {
  name: "ferry-get-bridge-quote",
  description: "Get a quote for bridging tokens between Ethereum and Neo X via FerrymanX",
  annotations: {
    title: "Get Bridge Quote",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function getBridgeQuote({ token, amount, direction }: InferSchema<typeof schema>) {
  return {
    status: "placeholder",
    request: {
      token,
      amount,
      direction
    },
    quote: {
      estimatedOutput: amount,
      bridgeFee: "0.1%",
      gasFee: {
        source: "0.001 ETH",
        destination: "0.1 GAS"
      },
      estimatedTime: "5-15 minutes",
      expiresAt: new Date(Date.now() + 60000).toISOString()
    },
    note: "This is a placeholder response. Connect the actual Ferry API at POST /api/bridge/quote to get live quotes."
  };
}
