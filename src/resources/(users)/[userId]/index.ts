/**
 * Resource: User Profile
 * 
 * This is a dynamic resource that accepts parameters.
 * It demonstrates how to create parameterized resources.
 * 
 * URI format: users://{userId}/profile
 * 
 * The folder structure determines the URI:
 * - (users) = URI scheme "users://"
 * - [userId] = dynamic parameter
 * - index.ts = resource handler
 * 
 * Learn more: https://xmcp.dev/docs/core-concepts/resources
 * 
 * Example use case:
 * - LLM can request user profile data by providing a userId
 * - Could be connected to a real database or API
 * - Provides read-only access to user information
 */

import { z } from "zod";
import { type ResourceMetadata, type InferSchema } from "xmcp";

// Define the schema for resource parameters
export const schema = {
  userId: z.string().describe("The ID of the user to retrieve"),
};

// Define resource metadata
export const metadata: ResourceMetadata = {
  name: "user-profile",
  title: "User Profile",
  description: "Get user profile information by user ID",
};

// Resource handler - returns user profile data
export default function handler({ userId }: InferSchema<typeof schema>) {
  // In a real application, this would fetch from a database or API
  // For this example, we return mock data
  return {
    userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
    role: "developer",
    joinedAt: "2024-01-01",
    note: "This is example data. In production, connect this to your database.",
  };
}
