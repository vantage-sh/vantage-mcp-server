import { pathEncode, type UpdateFinancialCommitmentReportRequest } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { dateIntervalOptions } from "../utils/dateIntervalOptions";
import dateValidator from "../utils/dateValidator";

const description = `
Updates an existing Financial Commitment Report. Use this to change the report title, VQL filter, date range, date bucket, on-demand costs scope, or grouping dimensions.

Date ranges can be set with either:
- date_interval, or
- start_date and end_date.

Unless date_interval is "custom", date_interval is incompatible with start_date and end_date.

VQL filters use financial commitment fields and should follow Vantage Query Language syntax. Additional VQL documentation is available at https://docs.vantage.sh/vql.
`.trim();

export default registerTool({
  name: "update-financial-commitment-report",
  title: "Update Financial Commitment Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    financial_commitment_report_token: z
      .string()
      .min(1)
      .describe("Token of the Financial Commitment Report to update."),
    title: z.string().min(1).optional().describe("Updated title for the Financial Commitment Report."),
    filter: z
      .string()
      .optional()
      .describe(
        "Updated VQL filter to apply to the Financial Commitment Report. Additional documentation is available at https://docs.vantage.sh/vql."
      ),
    start_date: dateValidator(
      "Updated start date for the Financial Commitment Report. YYYY-MM-DD formatted. Incompatible with 'date_interval' unless date_interval is 'custom'."
    ).optional(),
    end_date: dateValidator(
      "Updated end date for the Financial Commitment Report. YYYY-MM-DD formatted. Incompatible with 'date_interval' unless date_interval is 'custom'."
    ).optional(),
    date_interval: z
      .enum(dateIntervalOptions)
      .optional()
      .describe(
        "Updated date interval for the Financial Commitment Report. Unless 'custom' is used, this is incompatible with 'start_date' and 'end_date'."
      ),
    date_bucket: z.enum(["hour", "day", "week", "month", "quarter"]).optional().describe("Updated date bucket."),
    on_demand_costs_scope: z.enum(["discountable", "all"]).optional().describe("Updated on-demand costs scope."),
    groupings: z
      .array(z.string())
      .optional()
      .transform((v) => v?.join(","))
      .describe(
        "Updated grouping dimensions. Valid groupings: cost_type, commitment_type, commitment_id, service, resource_account_id, provider_account_id, region, cost_category, cost_sub_category, instance_type, tag, tag:<label_name>."
      ),
  },
  async execute(args, ctx) {
    const { financial_commitment_report_token, ...requestBody } = args;
    // The generated update type is behind the API for future intervals and CSV groupings.
    const body = requestBody as unknown as UpdateFinancialCommitmentReportRequest;
    const response = await ctx.callVantageApi(
      `/v2/financial_commitment_reports/${pathEncode(financial_commitment_report_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
