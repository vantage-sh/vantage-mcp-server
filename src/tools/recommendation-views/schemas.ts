import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const recommendationViewResponseSchema = z.object({
  token: z.string().nullable().optional().describe("The token identifying this resource."),
  title: z.string().nullable().optional().describe("The title of the RecommendationView."),
  workspace_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token for the Workspace the RecommendationView is a part of."),
  start_date: z
    .string()
    .nullable()
    .optional()
    .describe("Filter recommendations created on/after this YYYY-MM-DD date."),
  end_date: z.string().nullable().optional().describe("Filter recommendations created on/before this YYYY-MM-DD date."),
  provider_ids: z.array(z.string()).nullable().optional().describe("Filter by one or more providers."),
  billing_account_ids: z.array(z.string()).nullable().optional().describe("Filter by billing account identifiers."),
  account_ids: z.array(z.string()).nullable().optional().describe("Filter by cloud account identifiers."),
  regions: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Filter by region slugs (e.g. us-east-1, eastus, asia-east1)."),
  types: z.array(z.string()).nullable().optional().describe("Filter by one or more recommendation type slugs."),
  tag_key: z.string().nullable().optional().describe("Filter by tag key (must be used with tag_value)."),
  tag_value: z.string().nullable().optional().describe("Filter by tag value (requires tag_key)."),
  min_savings: z
    .number()
    .nullable()
    .optional()
    .describe("Filter recommendations with at least this amount of potential savings."),
  created_at: z
    .string()
    .nullable()
    .optional()
    .describe("The date and time, in UTC, the view was created. ISO 8601 Formatted."),
  created_by: z.string().nullable().optional().describe("The token for the Creator of this RecommendationView."),
});

export const listRecommendationViewsResponseSchema = z.object({
  recommendation_views: z.array(recommendationViewResponseSchema).optional().describe("Recommendation views."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listRecommendationViewsOutputSchema = listRecommendationViewsResponseSchema.shape;

export const recommendationViewOutputSchema = recommendationViewResponseSchema.shape;
