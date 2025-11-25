import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  fromToken: z.string().optional().describe("The token to swap from"),
  toToken: z.string().optional().describe("The token to swap to"),
};

export const metadata: PromptMetadata = {
  name: "swap-guide",
  title: "Token Swap Guide",
  description: "Guide for swapping tokens on Pitchforks DEX",
};

export default async function swapGuide({ fromToken, toToken }: InferSchema<typeof schema>) {
  const fromDisplay = fromToken || "[source token]";
  const toDisplay = toToken || "[destination token]";
  
  return `# Token Swap Guide - Pitchforks DEX

## Swapping ${fromDisplay} to ${toDisplay}

### Before You Begin

1. **Connect Your Wallet**: Visit dex.pitchforks.social and connect your Neo X wallet
2. **Check Balance**: Ensure you have enough ${fromDisplay} plus gas (GAS) for the transaction
3. **Review Prices**: Use \`dex-get-swap-quote\` to get current exchange rates

### Step-by-Step Swap Process

1. **Get a Quote**
   - Use the \`dex-get-swap-quote\` tool with:
     - fromToken: ${fromDisplay}
     - toToken: ${toDisplay}
     - amount: Your desired amount

2. **Review the Quote**
   - Check the estimated output amount
   - Review the price impact (higher = more slippage)
   - Note the fee (typically 0.3%)

3. **Execute the Swap**
   - Go to dex.pitchforks.social
   - Enter the swap details
   - Approve the token (first time only)
   - Confirm the transaction

### Important Notes

- **Slippage**: For volatile pairs, set appropriate slippage tolerance
- **Gas**: Keep some GAS in your wallet for transaction fees
- **Timing**: Quotes expire quickly in volatile markets

### Troubleshooting

- **Transaction Pending**: Check the Neo X block explorer
- **Failed Transaction**: Increase gas or slippage tolerance
- **Price Changed**: Get a new quote and try again

Need more help? Ask about specific tokens or issues.`;
}
