import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const workspaceResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  name: z.string().describe("The name of the Workspace."),
  created_at: z.string().describe("The date and time, in UTC, the Workspace was created. ISO 8601 Formatted."),
  enable_currency_conversion: z.boolean().describe("Whether or not currency conversion is enabled for the Workspace."),
  currency: z.string().describe("The currency code for the Workspace that will be used for currency conversion."),
  exchange_rate_date: z
    .string()
    .describe("The exchange rate date that will be used to convert currency for your cost data."),
});

export const listWorkspacesResponseSchema = z.object({
  workspaces: z.array(workspaceResponseSchema).describe("Workspaces."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const workspaceOutputSchema = workspaceResponseSchema.shape;

export const listWorkspacesOutputSchema = listWorkspacesResponseSchema.shape;
