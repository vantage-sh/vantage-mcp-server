import z from "zod";
import { linksSchema, paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const costProviderAccountResponseSchema = z.object({
  title: z.string().describe("The display name of the provider account."),
  account_id: z.string().describe("The provider account identifier (e.g., AWS account ID, Azure subscription ID)."),
  provider_uuid: z.string().describe("The provider-specific unique identifier."),
  provider: z.string().describe("The provider type (aws, azure, gcp, etc.)."),
});

export const costProviderAccountsResponseSchema = z.object({
  links: linksSchema.optional().describe("Links."),
  cost_provider_accounts: z.array(costProviderAccountResponseSchema).describe("Cost provider accounts."),
});

export const costProviderResponseSchema = z.object({
  name: z.string().describe("The name of the CostProvider. For Custom Providers, this is the customer-defined name."),
  key: z
    .string()
    .describe(
      "The key of the CostProvider, useful for filtering Costs. Custom Providers use the form custom_provider:<token>."
    ),
});

export const listCostProvidersResponseSchema = z.object({
  providers: z.array(costProviderResponseSchema).describe("Providers."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const costProviderAccountsOutputSchema = costProviderAccountsResponseSchema.shape;

export const listCostProvidersOutputSchema = listCostProvidersResponseSchema.shape;
