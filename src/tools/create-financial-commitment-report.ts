import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Create a new Financial Commitment Report in Vantage.

Financial Commitment Reports track committed spend and on-demand costs over time. They can be filtered
using VQL and grouped by dimensions such as commitment type, service, region, or tags.
`.trim();

type CreateFinancialCommitmentReportRequest = RequestBodyForPathAndMethod<"/v2/financial_commitment_reports", "POST">;

export default registerTool({
  name: "create-financial-commitment-report",
  title: "Create Financial Commitment Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: z.string().describe("Workspace to create the report in"),
    title: z.string().describe("Report title"),
    filter: z.string().optional().describe("VQL filter expression"),
    start_date: z.string().optional().describe("Report start date (ISO format)"),
    end_date: z.string().optional().describe("Report end date (ISO format)"),
    date_interval: z.string().optional().describe("Date interval"),
    date_bucket: z.enum(["hour", "day", "week", "month", "quarter"]).optional().describe("Date aggregation bucket"),
    on_demand_costs_scope: z.enum(["discountable", "all"]).optional().describe("Scope for on-demand costs"),
    groupings: z.array(z.string()).optional().describe("Grouping dimensions"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      "/v2/financial_commitment_reports",
      args as CreateFinancialCommitmentReportRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
