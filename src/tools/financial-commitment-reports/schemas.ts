import {
  createNonEmptyString,
  isNonEmptyString,
  VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS,
  type VantageFinancialCommitmentGrouping,
} from "@vantage-sh/vantage-client";
import z from "zod";
import { monetaryAmountSchema, paginationSchema } from "../../utils/zod/output";

export const groupingDescription = "Grouping dimensions for the report. Use tag:<tag_key> to group by tag.";

const groupingValueSchema = (description: string) =>
  z.union(
    [
      z.enum(VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS),
      z
        .string()
        .startsWith("tag:", { error: description })
        .refine((value) => isNonEmptyString(value.slice(4)), { error: description })
        .transform((value): VantageFinancialCommitmentGrouping => `tag:${createNonEmptyString(value.slice(4))}`),
    ],
    { error: description }
  );

export const groupingSchema = groupingValueSchema(groupingDescription);

export const costGroupingDescription = "Grouping dimensions for returned costs. Use tag:<tag_key> to group by tag.";

export const costGroupingSchema = groupingValueSchema(costGroupingDescription);

// Output schemas mirror the Vantage client response types.
export const financialCommitmentReportResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the FinancialCommitmentReport."),
  default: z.boolean().describe("Indicates whether the FinancialCommitmentReport is the default report."),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the FinancialCommitmentReport is a part of."),
  user_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token for the User who created this FinancialCommitmentReport."),
  start_date: z
    .string()
    .nullable()
    .describe("The start date for the FinancialCommitmentReport. Only set for custom date ranges. ISO 8601 Formatted."),
  end_date: z
    .string()
    .nullable()
    .describe("The end date for the FinancialCommitmentReport. Only set for custom date ranges. ISO 8601 Formatted."),
  date_interval: z
    .string()
    .nullable()
    .describe(
      "The date range for the FinancialCommitmentReport. Only present if a custom date range is not specified."
    ),
  date_bucket: z
    .string()
    .describe(
      "How costs are grouped and displayed in the FinancialCommitmentReport. Possible values: day, week, month."
    ),
  groupings: z.string().nullable().describe("The grouping aggregations applied to the filtered data."),
  on_demand_costs_scope: z.string().describe("The scope for the costs. Possible values: discountable, all."),
  filter: z
    .string()
    .nullable()
    .describe(
      "The filter applied to the FinancialCommitmentReport. Additional documentation available at https://docs.vantage.sh/vql."
    ),
});

export const listFinancialCommitmentReportsResponseSchema = z.object({
  financial_commitment_reports: z
    .array(financialCommitmentReportResponseSchema)
    .describe("Financial commitment reports."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const financialCommitmentReportCostTagResponseSchema = z.object({
  key: z.string().describe("The tag key."),
  value: z.string().nullable().describe("The tag value. Null when the cost is not tagged with this key."),
});

export const financialCommitmentReportCostResponseSchema = z.object({
  accrued_at: z.string().describe("The date the cost was accrued. ISO 8601 Formatted."),
  amount: z.string().describe("The net (discounted) cost amount."),
  gross_amount: z.string().describe("The gross cost amount before discounts."),
  on_demand_amount: z.string().describe("The on-demand usage cost amount."),
  covered_gross_amount: z.string().describe("The gross amount of costs covered by commitments."),
  currency: z.string().describe("The currency of the cost."),
  cost_type: z.string().nullable().optional().describe("The type of cost."),
  commitment_type: z.string().nullable().optional().describe("The type of financial commitment."),
  commitment_id: z.string().nullable().optional().describe("The identifier of the financial commitment."),
  service: z.string().nullable().optional().describe("The service which incurred the cost."),
  resource_account_id: z.string().nullable().optional().describe("The resource account ID which incurred the cost."),
  provider_account_id: z.string().nullable().optional().describe("The billing account ID which incurred the cost."),
  region: z.string().nullable().optional().describe("The region which incurred the cost."),
  cost_category: z.string().nullable().optional().describe("The category for the cost."),
  cost_sub_category: z.string().nullable().optional().describe("The subcategory for the cost."),
  instance_type: z.string().nullable().optional().describe("The instance type which incurred the cost."),
  tags: z
    .array(financialCommitmentReportCostTagResponseSchema)
    .optional()
    .describe("The tag key/value pairs attached to the cost that was incurred."),
});

export const queryFinancialCommitmentReportCostsResponseSchema = z.object({
  costs: z.array(financialCommitmentReportCostResponseSchema).describe("Costs."),
  total_amount: monetaryAmountSchema.describe("Total amount."),
  total_gross_amount: monetaryAmountSchema.describe("Total gross amount."),
  notes: z.string().describe("How the time bucket used for this query affects each cost record."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const financialCommitmentReportOutputSchema = financialCommitmentReportResponseSchema.shape;

export const listFinancialCommitmentReportsOutputSchema = listFinancialCommitmentReportsResponseSchema.shape;

export const queryFinancialCommitmentReportCostsOutputSchema = queryFinancialCommitmentReportCostsResponseSchema.shape;
