import z from "zod";

export const chartTypes = ["area", "line", "bar", "multi_bar", "pie"] as const;

export const chartSettings = z.object({
  x_axis_dimension: z
    .array(z.string())
    .optional()
    .describe(
      "The dimension used to group or label data along the x-axis (e.g., by date, region, or service). NOTE: Only one value is allowed at this time. Defaults to ['date']."
    ),
  y_axis_dimension: z
    .string()
    .optional()
    .describe(
      "The metric or measure displayed on the chart’s y-axis. Possible values: 'cost', 'usage'. Defaults to 'cost'."
    ),
});

export const dateBins = ["cumulative", "day", "week", "month", "quarter", "hour"] as const;

const businessMetricUnitScale = z.enum(["per_unit", "per_hundred", "per_thousand", "per_million", "per_billion"]);
const businessMetricCalcuationType = z.enum(["unit_cost", "gross_margin", "usage_unit_cost", "raw_business_metric"])

export const businessMetricTokenForCreate = z.object({
  business_metric_token: z.string().min(1).describe("The token of the BusinessMetric to attach to the CostReport."),
  unit_scale: businessMetricUnitScale
    .default("per_unit")
    .describe("Determines the scale of the BusinessMetric's values within the CostReport."),
  label_filter: z.array(z.string()).optional().describe("Include only values with these labels in the CostReport."),
  label: z.string().optional().describe("An optional label for this business metric on this report."),
  calculation_type: businessMetricCalcuationType.optional().describe("Calculation to apply to business metric value. Default: unit_cost")
});

export const businessMetricTokenForUpdate = z.object({
  business_metric_token: z.string().min(1).describe("The token of the BusinessMetric to attach to the CostReport."),
  unit_scale: businessMetricUnitScale
    .optional()
    .describe("Determines the scale of the BusinessMetric's values within the CostReport."),
  label_filter: z.array(z.string()).optional().describe("Include only values with these labels in the CostReport."),
  label: z.string().optional().describe("An optional label for this business metric on this report."),
  calculation_type: businessMetricCalcuationType.optional().describe("Calculation to apply to business metric value. Default: unit_cost")
});

export const costReportSettingsForCreate = z.object({
  include_credits: z.boolean().default(false).describe("Report will include credits."),
  include_refunds: z.boolean().default(false).describe("Report will include refunds."),
  include_discounts: z.boolean().default(true).describe("Report will include discounts."),
  include_tax: z.boolean().default(true).describe("Report will include tax."),
  amortize: z.boolean().default(true).describe("Report will amortize."),
  unallocated: z.boolean().default(false).describe("Report will show unallocated costs."),
  aggregate_by: z.enum(["cost", "usage"]).default("cost").describe("Report will aggregate by cost or usage."),
  show_previous_period: z
    .boolean()
    .default(true)
    .describe("Report will show previous period costs or usage comparison."),
  complete_period: z.boolean().default(false).describe("Report will restrict date ranges to completed periods only."),
});

export const costReportSettingsForUpdate = z.object({
  include_credits: z.boolean().optional().describe("Report will include credits."),
  include_refunds: z.boolean().optional().describe("Report will include refunds."),
  include_discounts: z.boolean().optional().describe("Report will include discounts."),
  include_tax: z.boolean().optional().describe("Report will include tax."),
  amortize: z.boolean().optional().describe("Report will amortize."),
  unallocated: z.boolean().optional().describe("Report will show unallocated costs."),
  aggregate_by: z.enum(["cost", "usage"]).optional().describe("Report will aggregate by cost or usage."),
  show_previous_period: z.boolean().optional().describe("Report will show previous period costs or usage comparison."),
});
