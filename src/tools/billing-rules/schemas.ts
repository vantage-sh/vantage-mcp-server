import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const billingRuleResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the BillingRule."),
  type: z.string().describe("The type of the BillingRule."),
  start_date: z.string().nullable().optional().describe("The start date of the BillingRule."),
  end_date: z.string().nullable().optional().describe("The end date of the BillingRule."),
  apply_to_all: z.boolean().nullable().describe("Whether the BillingRule applies to all future managed accounts."),
  created_by_token: z.string().describe("The token of the Creator of the BillingRule."),
  created_at: z.string().describe("The date and time, in UTC, the BillingRule was created. ISO 8601 Formatted."),
  service: z.string().nullable().optional().describe("The service for the BillingRule (Charge)."),
  category: z.string().nullable().optional().describe("The category for the BillingRule (Charge)."),
  percentage: z
    .string()
    .nullable()
    .optional()
    .describe("The percentage of the cost shown for the BillingRule (Adjustment)."),
  charge_type: z.string().nullable().optional().describe("The charge type for the BillingRule."),
  sub_category: z.string().nullable().optional().describe("The subcategory for the BillingRule (Charge)."),
  start_period: z.string().nullable().optional().describe("The start period for the BillingRule (Charge)."),
  amount: z.string().nullable().optional().describe("The amount for the BillingRule (Charge)."),
  sql_query: z.string().nullable().optional().describe("The SQL query for the BillingRule (Custom)."),
});

export const listBillingRulesResponseSchema = z.object({
  billing_rules: z.array(billingRuleResponseSchema).describe("Billing rules."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const billingRuleOutputSchema = billingRuleResponseSchema.shape;

export const listBillingRulesOutputSchema = listBillingRulesResponseSchema.shape;
