import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  direction: z.enum(["eth-to-neox", "neox-to-eth"]).optional().describe("The bridge direction"),
  token: z.string().optional().describe("The token to bridge"),
};

export const metadata: PromptMetadata = {
  name: "bridge-guide",
  title: "Bridge Guide",
  description: "Guide for bridging tokens between Ethereum and Neo X via FerrymanX",
};

export default async function bridgeGuide({ direction, token }: InferSchema<typeof schema>) {
  const directionDisplay = direction === "neox-to-eth" ? "Neo X → Ethereum" : "Ethereum → Neo X";
  const tokenDisplay = token || "[your token]";
  
  return `# Bridge Guide - FerrymanX

## Bridging ${tokenDisplay} ${directionDisplay}

### Overview

FerrymanX is the official bridge between Ethereum and Neo X. It provides safe passage for your tokens between chains.

### Before You Begin

1. **Wallets Ready**: Have wallets set up on both Ethereum and Neo X
2. **Gas on Both Chains**: You'll need ETH for Ethereum and GAS for Neo X
3. **Supported Token**: Verify your token is supported using \`ferry-get-status\`

### Bridge Process

1. **Check Bridge Status**
   \`\`\`
   Use: ferry-get-status
   \`\`\`
   Verify the bridge is operational.

2. **Get a Quote**
   \`\`\`
   Use: ferry-get-bridge-quote
   - token: ${tokenDisplay}
   - amount: Your amount
   - direction: ${direction || "eth-to-neox"}
   \`\`\`

3. **Review the Quote**
   - Bridge fee (typically 0.1%)
   - Gas fees on both chains
   - Estimated completion time (5-15 minutes)

4. **Initiate the Bridge**
   - Go to ferry.pitchforks.social
   - Connect your wallet
   - Enter bridge details
   - Approve and confirm

5. **Track Your Transfer**
   - Save your transaction ID
   - Monitor progress on the bridge interface
   - Wait for confirmation on destination chain

### Timing Expectations

| Step | Time |
|------|------|
| Source confirmation | 1-3 minutes |
| Bridge processing | 3-10 minutes |
| Destination arrival | 1-2 minutes |
| **Total** | **5-15 minutes** |

### Safety Tips

- **Never share private keys**: The bridge never asks for them
- **Start small**: Test with a small amount first
- **Save transaction IDs**: For support if needed
- **Be patient**: Cross-chain transfers take time

### Troubleshooting

- **Stuck transaction**: Check both chain explorers
- **Tokens not appearing**: Wait for full confirmation
- **Error messages**: Check wallet connection and gas balance

Need help with a specific bridge transfer? Provide the transaction details.`;
}
