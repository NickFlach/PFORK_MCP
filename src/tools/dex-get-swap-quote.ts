import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";

export const schema = {
  fromToken: z.string().describe("The token address or symbol to swap from"),
  toToken: z.string().describe("The token address or symbol to swap to"),
  amount: z.string().describe("The amount to swap (in base units)")
};

export const metadata: ToolMetadata = {
  name: "dex-get-swap-quote",
  description: "Get a price quote for swapping tokens on Pitchforks DEX",
  annotations: {
    title: "Get Swap Quote",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function getSwapQuote({ fromToken, toToken, amount }: InferSchema<typeof schema>) {
  return {
    status: "placeholder",
    request: {
      fromToken,
      toToken,
      amount
    },
    quote: {
      estimatedOutput: "0",
      priceImpact: "0%",
      fee: "0.3%",
      route: [fromToken, toToken],
      expiresAt: new Date(Date.now() + 30000).toISOString()
    },
    note: "This is a placeholder response. Connect the actual DEX API at POST /api/swap/quote to get live quotes."
  };
}
