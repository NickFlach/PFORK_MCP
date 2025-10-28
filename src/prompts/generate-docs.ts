/**
 * Prompt: Generate Documentation
 * 
 * This prompt instructs LLMs to generate comprehensive documentation for code.
 * Useful for creating README files, API docs, or inline documentation.
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/prompts
 */

import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  code: z.string().describe("The code to document"),
  type: z.enum(["README", "API", "inline", "JSDoc"]).describe("Type of documentation to generate"),
  language: z.string().optional().describe("Programming language"),
};

export const metadata: PromptMetadata = {
  name: "generate-docs",
  title: "Generate Documentation",
  description: "Generate comprehensive documentation for code (README, API docs, JSDoc, etc.)",
  role: "user",
};

export default function generateDocs({ code, type, language }: InferSchema<typeof schema>) {
  const templates = {
    README: `Generate a comprehensive README.md file for this code that includes:
- Project overview and purpose
- Installation instructions
- Usage examples
- API reference
- Configuration options
- Contributing guidelines`,
    
    API: `Generate API documentation for this code that includes:
- Endpoint/function descriptions
- Parameters and their types
- Return values
- Example requests/responses
- Error handling`,
    
    inline: `Add clear, helpful inline comments to this code that explain:
- What each section does
- Why certain approaches were chosen
- Any complex logic or algorithms
- Edge cases and assumptions`,
    
    JSDoc: `Add JSDoc/docstring comments to all functions and classes that include:
- Description of purpose
- @param tags for all parameters
- @returns tag for return values
- @example usage examples
- @throws for potential errors`,
  };

  return `${templates[type]}

Language: ${language || 'auto-detect'}

Code to document:
\`\`\`${language || ''}
${code}
\`\`\`

Please generate clear, accurate, and helpful documentation.`;
}
