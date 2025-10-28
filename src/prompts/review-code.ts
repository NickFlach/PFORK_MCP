/**
 * Prompt: Code Review
 * 
 * This prompt template provides structured code review instructions to LLMs.
 * 
 * Prompts are user-controlled instruction templates that enable consistent,
 * parameterized interactions. They consist of:
 * 1. Schema - Defines input parameters using Zod
 * 2. Metadata - Describes the prompt's purpose
 * 3. Handler - Returns the formatted prompt text
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/prompts
 * 
 * To create a new prompt:
 * - Create a new file in src/prompts/
 * - Export schema, metadata, and a default handler function
 * - Run `npm run build` to compile
 * - The prompt is automatically discovered and registered
 */

import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

// Define input parameters for the prompt
export const schema = {
  code: z.string().describe("The code to review"),
  language: z.string().optional().describe("Programming language (e.g., typescript, python)"),
  focus: z.string().optional().describe("Specific area to focus on (e.g., security, performance)"),
};

// Define prompt metadata
export const metadata: PromptMetadata = {
  name: "review-code",
  title: "Code Review",
  description: "Review code for quality, bugs, security, performance, and maintainability",
  role: "user",
};

// Prompt implementation - returns formatted instructions
export default function reviewCode({ code, language, focus }: InferSchema<typeof schema>) {
  const focusArea = focus ? `\n\nPay special attention to: ${focus}` : '';
  const langHint = language ? ` (${language})` : '';
  
  return `Please review this code${langHint} for:

1. **Code Quality & Best Practices**
   - Follows language/framework conventions
   - Proper naming and code organization
   - Appropriate use of design patterns

2. **Potential Bugs & Edge Cases**
   - Logic errors or race conditions
   - Null/undefined handling
   - Error handling and validation

3. **Security Issues**
   - Input validation and sanitization
   - Authentication and authorization
   - Sensitive data exposure

4. **Performance Optimizations**
   - Algorithm efficiency
   - Resource usage (memory, CPU)
   - Database query optimization

5. **Readability & Maintainability**
   - Clear and concise code
   - Helpful comments where needed
   - Testability${focusArea}

Code to review:
\`\`\`${language || ''}
${code}
\`\`\`

Please provide specific, actionable feedback with examples where applicable.`;
}
