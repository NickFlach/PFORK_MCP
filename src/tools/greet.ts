/**
 * Example Tool: Greet User
 * 
 * This is a simple example tool that demonstrates the basic structure of an xmcp tool.
 * 
 * Tools are functions that LLMs can call to perform actions. They consist of:
 * 1. Schema - Defines input parameters using Zod
 * 2. Metadata - Describes the tool's purpose and behavior
 * 3. Handler - The actual implementation
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/tools
 * 
 * To create a new tool:
 * - Create a new file in src/tools/
 * - Export schema, metadata, and a default handler function
 * - Run `npm run build` to compile
 * - The tool is automatically discovered and registered
 */

import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";

// Define input schema with Zod validation
export const schema = {
  name: z.string().describe("The name of the user to greet"),
};

// Define tool metadata for LLM discovery
export const metadata: ToolMetadata = {
  name: "greet",
  description: "Greet a user by name with a friendly message",
  annotations: {
    title: "Greet User",
    readOnlyHint: true,      // This tool doesn't modify data
    destructiveHint: false,   // This tool doesn't delete anything
    idempotentHint: true,     // Multiple calls produce same result
  },
};

// Tool implementation - returns a greeting message
export default async function greet({ name }: InferSchema<typeof schema>) {
  return `Hello, ${name}! Welcome to this xmcp MCP server.`;
}
