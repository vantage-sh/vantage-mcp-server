import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const resourceCostResponseSchema = z.object({
  category: z.string().describe("The category of the cost."),
  amount: z.number().describe("The cost amount."),
});

export const resourceResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  uuid: z.string().describe("The unique identifier for the resource."),
  type: z.string().describe("The kind of resource."),
  label: z.string().nullable().describe("Label."),
  metadata: z.record(z.string(), z.unknown()).nullable().describe("Type-specific attributes of the resource."),
  account_id: z.string().nullable().describe("The provider account where the resource is located."),
  billing_account_id: z.string().nullable().describe("The provider billing account this resource is charged to."),
  provider: z.string().describe("The provider of the resource."),
  region: z
    .string()
    .nullable()
    .describe("The region where the resource is located. Region values are specific to each provider."),
  costs: z.array(resourceCostResponseSchema).optional().describe("The cost of the resource broken down by category."),
  created_at: z.string().describe("The date and time when Vantage first observed the resource."),
  tags: z.record(z.string(), z.unknown()).describe("Key-value pairs of tags associated with the resource."),
});

export const listProviderResourcesResponseSchema = z.object({
  resources: z.array(resourceResponseSchema).describe("Resources."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const resourceOutputSchema = resourceResponseSchema.shape;

export const listProviderResourcesOutputSchema = listProviderResourcesResponseSchema.shape;
