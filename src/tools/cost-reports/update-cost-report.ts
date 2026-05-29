import { pathEncode, type UpdateCostReportRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { dateIntervalOptions } from "../utils/dateIntervalOptions";
import dateValidator from "../utils/dateValidator";

const description = `
Updates an existing Cost Report. Use to change the title, VQL filter, groupings, date range, chart type, folder, report settings, or attached business metrics.

Do not use create-cost-report (creates a new report) or get-cost-report (reads without changing). Use list-cost-reports or get-cost-report to find the cost_report_token.
`.trim();

const businessMetricToken = z.object({
  business_metric_token: z.string().min(1).describe("The token of the BusinessMetric to attach to the CostReport."),
  unit_scale: z
    .enum(["per_unit", "per_hundred", "per_thousand", "per_million", "per_billion"])
    .optional()
    .describe("Determines the scale of the BusinessMetric's values within the CostReport."),
  label_filter: z.array(z.string()).optional().describe("Include only values with these labels in the CostReport."),
});

const settings = z.object({
  include_credits: z.boolean().optional().describe("Report will include credits."),
  include_refunds: z.boolean().optional().describe("Report will include refunds."),
  include_discounts: z.boolean().optional().describe("Report will include discounts."),
  include_tax: z.boolean().optional().describe("Report will include tax."),
  amortize: z.boolean().optional().describe("Report will amortize."),
  unallocated: z.boolean().optional().describe("Report will show unallocated costs."),
  aggregate_by: z.enum(["cost", "usage"]).optional().describe("Report will aggregate by cost or usage."),
  show_previous_period: z.boolean().optional().describe("Report will show previous period costs or usage comparison."),
});

const chartTypes = ["area", "line", "bar", "multi_bar", "pie"] as const;

const chartSettings = z.object({
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

const dateBins = ["cumulative", "day", "week", "month", "quarter"] as const;

export default registerTool({
  name: "update-cost-report",
  title: "Update Cost Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    cost_report_token: z.string().min(1).describe("The token of the Cost Report to update."),
    title: z.string().min(1).optional().describe("Updated title for the Cost Report."),
    groupings: z
      .array(z.string())
      .optional()
      .transform((v) => (v === undefined ? undefined : v.join(",")))
      .describe(
        "Updated grouping values. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>."
      ),
    filter: z
      .string()
      .optional()
      .describe("Updated VQL filter. Use list-cost-providers and list-cost-services for valid names."),
    saved_filter_tokens: z
      .array(z.string())
      .optional()
      .describe("Updated SavedFilter tokens to apply to the Cost Report."),
    business_metric_tokens_with_metadata: z
      .array(businessMetricToken)
      .optional()
      .describe("Updated BusinessMetric tokens and unit scale metadata."),
    folder_token: z
      .string()
      .optional()
      .describe("Updated Folder token. Determines the Workspace the report is assigned to."),
    settings: settings.optional().describe("Updated report settings."),
    previous_period_start_date: dateValidator(
      "Updated previous period start date. ISO 8601 formatted (YYYY-MM-DD)."
    ).optional(),
    previous_period_end_date: dateValidator(
      "Updated previous period end date. ISO 8601 formatted (YYYY-MM-DD). Required when previous_period_start_date is set."
    ).optional(),
    start_date: dateValidator(
      "Updated start date. ISO 8601 formatted (YYYY-MM-DD). Incompatible with date_interval."
    ).optional(),
    end_date: dateValidator(
      "Updated end date. ISO 8601 formatted (YYYY-MM-DD). Required when start_date is set. Incompatible with date_interval."
    ).optional(),
    date_interval: z
      .enum(dateIntervalOptions)
      .optional()
      .describe("Updated date interval. Incompatible with start_date and end_date."),
    chart_type: z.enum(chartTypes).optional().describe("Updated chart type."),
    chart_settings: chartSettings.optional().describe("Updated chart settings."),
    date_bin: z.enum(dateBins).optional().describe("Updated date bin for how costs are bucketed over time."),
  },
  async execute(args, ctx) {
    if (!!args.previous_period_start_date !== !!args.previous_period_end_date) {
      throw new MCPUserError({
        errors: [{ message: "previous_period_start_date and previous_period_end_date must both be provided together" }],
      });
    }
    if (!!args.start_date !== !!args.end_date) {
      throw new MCPUserError({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    }
    if (args.date_interval !== undefined && (args.start_date !== undefined || args.end_date !== undefined)) {
      throw new MCPUserError({
        errors: [{ message: "date_interval cannot be used together with start_date or end_date" }],
      });
    }

    const { cost_report_token, ...requestBody } = args;
    const body: UpdateCostReportRequest = {
      ...requestBody,
      previous_period_end_date:
        requestBody.previous_period_end_date as UpdateCostReportRequest["previous_period_end_date"],
      end_date: requestBody.end_date as UpdateCostReportRequest["end_date"],
    };
    const response = await ctx.callVantageApi(`/v2/cost_reports/${pathEncode(cost_report_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
