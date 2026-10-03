import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const userResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  name: z.string().nullable().describe("The name of the User."),
  email: z.string().describe("The email of the User."),
  role: z.string().describe("The role of the User."),
  default_dashboard_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token of the default Dashboard for the User."),
  last_seen_at: z.string().nullable().optional().describe("The last time the User logged in."),
});

export const getUsersResponseSchema = z.object({
  users: z.array(userResponseSchema).describe("Users."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const userOutputSchema = userResponseSchema.shape;

export const getUsersOutputSchema = getUsersResponseSchema.shape;
