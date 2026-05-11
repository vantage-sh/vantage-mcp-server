import { pathEncode, type UpdateFinancialCommitmentReportRequest } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Updates an existing Financial Commitment Report. You can update its title, filter, date range, date bucket, on-demand costs scope, or grouping dimensions.
`.trim();

export default registerTool({
  name: "update-financial-commitment-report",
  title: "Update Financial Commitment Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    financial_commitment_report_token: z.string().describe("Token of the Financial Commitment Report to update."),
    title: z.string().optional().describe("Updated report title."),
    filter: z.string().optional().describe("Updated VQL filter."),
    start_date: z.string().optional().describe("Updated start date."),
    end_date: z.string().optional().describe("Updated end date."),
    date_interval: z.string().optional().describe("Updated date interval."),
    date_bucket: z.enum(["hour", "day", "week", "month", "quarter"]).optional().describe("Updated date bucket."),
    on_demand_costs_scope: z.enum(["discountable", "all"]).optional().describe("Updated on-demand costs scope."),
    groupings: z.array(z.string()).optional().describe("Updated grouping dimensions."),
  },
  async execute(args, ctx) {
    const { financial_commitment_report_token, ...requestBody } = args;
    const body: UpdateFinancialCommitmentReportRequest = {
      ...requestBody,
      date_interval: requestBody.date_interval as UpdateFinancialCommitmentReportRequest["date_interval"],
    };
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
