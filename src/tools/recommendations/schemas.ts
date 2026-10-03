import z from "zod";
import { paginationSchema } from "../../utils/zod/output";
import { resourceResponseSchema } from "../provider-resources/schemas";

// Output schemas mirror the Vantage client response types.
export const recommendationResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  type: z
    .string()
    .describe("The type of the Recommendation. This is analogous to category, but with a uniform format."),
  category: z.string().describe("The category of the Recommendation."),
  workspace_token: z.string().describe("The token for the Workspace the Recommendation is a part of."),
  provider: z.string().describe("The provider the Recommendation is for."),
  provider_account_id: z
    .string()
    .nullable()
    .describe("The account ID of the provider. For Azure, this is the subscription ID."),
  description: z.string().describe("Description."),
  documentation_url: z.string().nullable().describe("A URL to related documentation if available."),
  potential_savings: z
    .string()
    .nullable()
    .describe(
      "The monthly potential savings of the Recommendation, converted to the organization's selected currency."
    ),
  service: z.string().describe("The service the Recommendation is for."),
  created_at: z.string().describe("The date and time, in UTC, the Recommendation was created. ISO 8601 Formatted."),
  resources_affected_count: z
    .number()
    .describe(
      "The number of ProviderResources related to the Recommendation. Use the `recommendations/:token/resources` endpoint to get the full list of resources."
    ),
  currency_code: z
    .string()
    .nullable()
    .optional()
    .describe("The currency code used by the Workspace to which this Recommendation belongs."),
  currency_symbol: z
    .string()
    .nullable()
    .optional()
    .describe("The currency symbol used by the Workspace to which this Recommendation belongs."),
});

export const recommendationActionResponseSchema = z.object({
  action: z.string().describe("Action."),
  description: z.string().describe("Description."),
  potential_savings: z.string().describe("Potential savings in dollars"),
  instance_type: z.string().nullable().optional().describe("Instance type."),
  containers: z.string().nullable().optional().describe("Containers."),
  remediation_cli_command: z.string().nullable().optional().describe("CLI command to remediate this recommendation"),
});

export const recommendationProviderResourceResponseSchema = resourceResponseSchema.extend({
  resource_id: z.string().describe("The unique identifier of the Active Resource."),
  recommendation_actions: z
    .array(recommendationActionResponseSchema)
    .optional()
    .describe("The actions to take to implement the Recommendation."),
});

export const getRecommendationResourcesResponseSchema = z.object({
  resources: z.array(recommendationProviderResourceResponseSchema).describe("Resources."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listRecommendationsResponseSchema = z.object({
  recommendations: z.array(recommendationResponseSchema).describe("Recommendations."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const recommendationOutputSchema = recommendationResponseSchema.shape;

export const recommendationProviderResourceOutputSchema = recommendationProviderResourceResponseSchema.shape;

export const getRecommendationResourcesOutputSchema = getRecommendationResourcesResponseSchema.shape;

export const listRecommendationsOutputSchema = listRecommendationsResponseSchema.shape;
