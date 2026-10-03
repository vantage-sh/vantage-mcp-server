import z from "zod";
import { vantageToken } from "../../utils/zod";
import { costProviderSchema, linksSchema, paginationSchema } from "../../utils/zod/output";

export const chartTypes = ["area", "line", "bar", "multi_bar", "pie"] as const;

export const chartSettings = z.object({
  x_axis_dimension: z
    .array(z.string())
    .optional()
    .describe(
      "The dimension used to group or label data along the x-axis (e.g., by date, region, or service). NOTE: Only one value is allowed at this time. Defaults to ['date']."
    ),
  y_axis_dimension: z
    .enum(["cost", "usage", "count"])
    .optional()
    .describe(
      "The metric or measure displayed on the chart’s y-axis. Possible values: 'cost', 'usage', 'count'. Defaults to 'cost'."
    ),
});

export const dateBins = ["cumulative", "day", "week", "month", "quarter", "hour"] as const;

const businessMetricUnitScale = z.enum(["per_unit", "per_hundred", "per_thousand", "per_million", "per_billion"]);
const businessMetricCalcuationType = z.enum(["unit_cost", "gross_margin", "usage_unit_cost", "raw_business_metric"]);

export const businessMetricTokenForCreate = z.object({
  business_metric_token: vantageToken("business_metric"),
  unit_scale: businessMetricUnitScale
    .default("per_unit")
    .describe("Determines the scale of the BusinessMetric's values within the CostReport."),
  label_filter: z.array(z.string()).optional().describe("Include only values with these labels in the CostReport."),
  label: z.string().optional().describe("An optional label for this business metric on this report."),
  calculation_type: businessMetricCalcuationType
    .optional()
    .describe("Calculation to apply to business metric value. Default: unit_cost"),
});

export const businessMetricTokenForUpdate = z.object({
  business_metric_token: vantageToken("business_metric"),
  unit_scale: businessMetricUnitScale
    .optional()
    .describe("Determines the scale of the BusinessMetric's values within the CostReport."),
  label_filter: z.array(z.string()).optional().describe("Include only values with these labels in the CostReport."),
  label_filters: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe("Include only BusinessMetric values matching every label key and one of its values."),
  label: z.string().optional().describe("An optional label for this business metric on this report."),
  calculation_type: businessMetricCalcuationType
    .optional()
    .describe("Calculation to apply to business metric value. Default: unit_cost"),
});

export const costReportSettingsForCreate = z.object({
  include_credits: z.boolean().default(false).describe("Report will include credits."),
  include_refunds: z.boolean().default(false).describe("Report will include refunds."),
  include_discounts: z.boolean().default(true).describe("Report will include discounts."),
  include_tax: z.boolean().default(true).describe("Report will include tax."),
  amortize: z.boolean().default(true).describe("Report will amortize."),
  unallocated: z.boolean().default(false).describe("Report will show unallocated costs."),
  aggregate_by: z
    .enum(["cost", "usage", "count"])
    .optional()
    .describe("Report will aggregate by cost, usage, or count. Defaults to cost when omitted."),
  show_previous_period: z
    .boolean()
    .default(true)
    .describe("Report will show previous period cost, usage, or count comparison."),
  complete_period: z.boolean().default(false).describe("Report will restrict date ranges to completed periods only."),
});

export const costReportSettingsForUpdate = z.object({
  include_credits: z.boolean().optional().describe("Report will include credits."),
  include_refunds: z.boolean().optional().describe("Report will include refunds."),
  include_discounts: z.boolean().optional().describe("Report will include discounts."),
  include_tax: z.boolean().optional().describe("Report will include tax."),
  amortize: z.boolean().optional().describe("Report will amortize."),
  unallocated: z.boolean().optional().describe("Report will show unallocated costs."),
  aggregate_by: z
    .enum(["cost", "usage", "count"])
    .optional()
    .describe("Report will aggregate by cost, usage, or count."),
  show_previous_period: z
    .boolean()
    .optional()
    .describe("Report will show previous period cost, usage, or count comparison."),
  complete_period: z.boolean().optional().describe("Report will restrict date ranges to completed periods only."),
});

// Output schemas mirror the Vantage client response types.
export const attachedBusinessMetricForCostReportResponseSchema = z.object({
  business_metric_token: z.string().describe("The token of the BusinessMetric that's attached to the CostReport."),
  unit_scale: z
    .enum(["per_unit", "per_hundred", "per_thousand", "per_million", "per_billion"])
    .describe("Determines the scale of the BusinessMetric's values within a particular CostReport."),
  calculation_type: z
    .enum(["unit_cost", "gross_margin", "usage_unit_cost", "raw_business_metric"])
    .describe("The calculation type applied when this BusinessMetric is used in the CostReport."),
  label: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional custom display name for this BusinessMetric on the CostReport. When omitted, a default is derived from the calculation type."
    ),
  label_filter: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("The labels that the BusinessMetric is filtered by within a particular CostReport."),
  label_filters: z
    .record(z.string(), z.array(z.string()))
    .nullable()
    .optional()
    .describe(
      "The ClickHouse BusinessMetric label filters applied within a CostReport. Each key is required and values within a key are alternatives."
    ),
});

export const defaultForecastResponseSchema = z.object({
  kind: z.enum(["report_forecast", "baseline"]).describe("The default forecast selection kind."),
  report_forecast_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token for the report forecast selected as the default."),
});

export const settingsResponseSchema = z.object({
  include_credits: z.boolean().nullable().optional().describe("Report will include credits."),
  include_refunds: z.boolean().nullable().optional().describe("Report will include refunds."),
  include_discounts: z.boolean().nullable().optional().describe("Report will include discounts."),
  include_tax: z.boolean().nullable().optional().describe("Report will include tax."),
  amortize: z.boolean().nullable().optional().describe("Report will amortize."),
  unallocated: z.boolean().nullable().optional().describe("Report will show unallocated costs."),
  aggregate_by: z
    .enum(["cost", "usage", "count"])
    .nullable()
    .optional()
    .describe("Report will aggregate by cost, usage, or count."),
  show_previous_period: z
    .boolean()
    .nullable()
    .optional()
    .describe("Report will show previous period cost, usage, or count comparison."),
  complete_period: z
    .boolean()
    .nullable()
    .optional()
    .describe("Report will restrict date ranges to completed periods only."),
});

export const chartSettingsResponseSchema = z.object({
  y_axis_dimension: z
    .enum(["cost", "usage", "count"])
    .describe(
      "The metric or measure displayed on the chart’s y-axis. Possible values: 'cost', 'usage', 'count'. Defaults to 'cost'."
    ),
  x_axis_dimension: z
    .array(z.string())
    .describe(
      "The dimension used to group or label data along the x-axis (e.g., by date, region, or service). NOTE: Only one value is allowed at this time. Defaults to ['date']."
    ),
});

export const costReportResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the CostReport."),
  folder_token: z.string().nullable().optional().describe("The token for the Folder the CostReport is a part of."),
  saved_filter_tokens: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("The tokens for the SavedFilters assigned to the CostReport."),
  business_metric_tokens_with_metadata: z
    .array(attachedBusinessMetricForCostReportResponseSchema)
    .describe("The tokens for the BusinessMetrics assigned to the CostReport, the unit scale, and label filter."),
  default_forecast: defaultForecastResponseSchema.describe("Default forecast."),
  filter: z
    .string()
    .nullable()
    .describe(
      "The filter applied to the CostReport. Additional documentation available at https://docs.vantage.sh/vql."
    ),
  groupings: z.string().nullable().optional().describe("The grouping aggregations applied to the filtered data."),
  settings: settingsResponseSchema.optional().describe("Report settings."),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the CostReport is a part of."),
  previous_period_start_date: z
    .string()
    .nullable()
    .optional()
    .describe("The previous period start date of the CostReport. ISO 8601 Formatted."),
  previous_period_end_date: z
    .string()
    .nullable()
    .optional()
    .describe("The previous period end date of the CostReport. ISO 8601 Formatted."),
  start_date: z
    .string()
    .nullable()
    .optional()
    .describe("The start date of the CostReports. ISO 8601 Formatted. Overwrites 'date_interval' if set."),
  end_date: z
    .string()
    .nullable()
    .optional()
    .describe("The end date of the CostReports. ISO 8601 Formatted. Overwrites 'date_interval' if set."),
  date_interval: z.string().describe("The date interval of the CostReport."),
  chart_type: z.string().describe("The chart type of the CostReport."),
  date_bin: z.string().describe("The date bin of the CostReport."),
  chart_settings: chartSettingsResponseSchema.describe("Chart settings."),
});

export const forecastedCostResponseSchema = z.object({
  links: linksSchema.optional().describe("Links."),
  date: z.string().describe("The date the forecasted cost is projected to accrue. ISO 8601 Formatted."),
  amount: z.string().describe("The amount of the forecasted cost."),
  provider: costProviderSchema
    .or(z.literal("all"))
    .describe("The cost provider which incurred the cost. Will be 'all' for all combined providers."),
  service: z.string().describe("The service for the forecasted cost. Will be 'all' for all combined services"),
});

export const getCostReportForecastResponseSchema = z.object({
  forecasted_costs: z.array(forecastedCostResponseSchema).describe("Forecasted costs."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listCostReportsResponseSchema = z.object({
  cost_reports: z.array(costReportResponseSchema).describe("Cost reports."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const costReportOutputSchema = costReportResponseSchema.shape;

export const getCostReportForecastOutputSchema = getCostReportForecastResponseSchema.shape;

export const listCostReportsOutputSchema = listCostReportsResponseSchema.shape;
