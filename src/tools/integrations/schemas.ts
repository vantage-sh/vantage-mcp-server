import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const integrationResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  provider: z.string().describe("The name of the Integration."),
  account_identifier: z
    .string()
    .nullable()
    .describe("The account identifier. For GCP this is the billing Account ID, for Azure this is the account ID"),
  status: z
    .enum(["error", "connected", "pending", "importing", "imported", "disconnected"])
    .describe(
      "The status of the Integration. Can be 'connected', 'error', 'pending', 'importing', 'imported', or 'disconnected'."
    ),
  last_updated: z
    .string()
    .nullable()
    .optional()
    .describe("The date and time, in UTC, when the Integration was last updated. ISO 8601 Formatted."),
  workspace_tokens: z.array(z.string()).describe("The tokens for any Workspaces that the account belongs to."),
  created_at: z.string().describe("The date and time, in UTC, the Integration was created. ISO 8601 Formatted."),
  managed_account_tokens: z
    .array(z.string())
    .describe("The tokens for any Managed Accounts that are associated with the Integration."),
  enriched_by: z
    .array(z.string())
    .describe(
      "Tokens of the data integrations that enrich this integration's costs. Empty when enrichment is not connected."
    ),
});

export const listCostIntegrationsResponseSchema = z.object({
  integrations: z.array(integrationResponseSchema).describe("Integrations."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listCostIntegrationsOutputSchema = listCostIntegrationsResponseSchema.shape;
