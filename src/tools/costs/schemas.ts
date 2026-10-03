import z from "zod";
import { costProviderSchema, linksSchema, monetaryAmountSchema, paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const costCountResponseSchema = z.object({
  accrued_at: z.string().describe("The date bin for the count. ISO 8601 Formatted."),
  count: z.number().describe("The number of distinct Group By permutations carrying cost in the date bin."),
});

export const costResponseSchema = z.object({
  links: linksSchema.optional().describe("Links."),
  accrued_at: z
    .string()
    .describe(
      "The date that the cost was accrued. ISO 8601 Formatted. Hourly date_bin responses include the hour (e.g. 2023-09-05T13:00:00Z); other bins are date-only."
    ),
  amount: z.string().describe("The amount of the cost."),
  currency: z.string().describe("The currency of the cost."),
  usage: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe("The usage amount and unit incurred by the cost."),
  provider: costProviderSchema.nullable().optional().describe("The cost provider which incurred the cost."),
  billing_account_id: z
    .string()
    .nullable()
    .optional()
    .describe("The cost provider's billing account id that incurred the cost."),
  account_id: z.string().nullable().optional().describe("The cost provider's account id that incurred the cost."),
  service: z.string().nullable().optional().describe("The service which incurred the cost."),
  region: z.string().nullable().optional().describe("The region which incurred the cost."),
  resource_id: z.string().nullable().optional().describe("The resource id which incurred the cost."),
  resource_name: z
    .string()
    .nullable()
    .optional()
    .describe("The human-readable resource name when Vantage can enrich the resource id."),
  tag: z
    .string()
    .nullable()
    .optional()
    .describe("The tag attached to the cost that was incurred. DEPRECATED: does not support multiple tags."),
  tags: z.array(z.string()).nullable().optional().describe("The tag pairs attached to the cost that was incurred."),
  cost_category: z.string().nullable().optional().describe("The category for the cost."),
  cost_subcategory: z.string().nullable().optional().describe("The subcategory for the cost."),
  charge_type: z.string().nullable().optional().describe("The charge type for the cost."),
  tagged: z.boolean().nullable().optional().describe("Whether the cost has tags."),
  usage_unit: z.string().nullable().optional().describe("The unit used to measure usage."),
  segment: z.string().nullable().optional().describe("The segment name for segment report costs."),
});

export const listCostsResponseSchema = z.object({
  notes: z.string().describe("How the time bucket used for this query affects each cost record."),
  pagination: paginationSchema.describe("Pagination information for these results."),
  counts: z
    .array(costCountResponseSchema)
    .optional()
    .describe("Date-binned distinct Group By permutation counts for the requested period."),
  total_count: z.number().optional().describe("Total distinct Group By permutation count for the requested period."),
  costs: z.array(costResponseSchema).describe("Costs."),
  total_cost: monetaryAmountSchema.describe("Total cost."),
});

export const unitCostResponseSchema = z.object({
  links: linksSchema.optional().describe("Links."),
  business_metric_token: z.string().describe("The token of the BusinessMetric for which the unit cost was calculated."),
  business_metric_title: z.string().describe("The title of the BusinessMetric for which the unit cost was calculated."),
  calculation_type: z
    .enum(["unit_cost", "gross_margin", "usage_unit_cost", "raw_business_metric"])
    .describe("The calculation type applied to produce this result."),
  unit_cost_amount: z
    .string()
    .describe("The amount of the unit cost. For raw_business_metric types, this equals the business_metric_amount."),
  business_metric_amount: z.string().describe("The amount of the business metric."),
  scale: z.number().describe("The scale of the BusinessMetric's values within a particular CostReport."),
  date: z.string().describe("The date for which the unit cost was calculated. ISO 8601 Formatted."),
});

export const listUnitCostsResponseSchema = z.object({
  unit_costs: z.array(unitCostResponseSchema).describe("Unit costs."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const queryCostsResponseSchema = listCostsResponseSchema.extend({
  hint: z.string().optional().describe("Suggested follow-up when the query returns no cost rows."),
});

export const listCostsOutputSchema = listCostsResponseSchema.shape;

export const listUnitCostsOutputSchema = listUnitCostsResponseSchema.shape;

export const queryCostsOutputSchema = queryCostsResponseSchema.shape;
