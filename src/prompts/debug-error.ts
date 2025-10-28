/**
 * Prompt: Debug Error
 * 
 * This prompt helps LLMs analyze and debug errors by providing context
 * about the error message, stack trace, and relevant code.
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/prompts
 */

import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  error: z.string().describe("The error message or stack trace"),
  code: z.string().optional().describe("Relevant code that caused the error"),
  context: z.string().optional().describe("Additional context (what you were trying to do)"),
};

export const metadata: PromptMetadata = {
  name: "debug-error",
  title: "Debug Error",
  description: "Analyze and debug errors with detailed explanations and solutions",
  role: "user",
};

export default function debugError({ error, code, context }: InferSchema<typeof schema>) {
  return `Please help me debug this error:

Error:
\`\`\`
${error}
\`\`\`
${context ? `\nContext: ${context}` : ''}
${code ? `\nRelevant code:\n\`\`\`\n${code}\n\`\`\`` : ''}

Please provide:
1. **Root Cause Analysis**: What's causing this error?
2. **Explanation**: Why is this happening?
3. **Solution**: How to fix it (with code examples if applicable)
4. **Prevention**: How to prevent similar errors in the future
5. **Related Issues**: Any other potential problems to watch out for

Be specific and provide actionable steps to resolve the issue.`;
}
