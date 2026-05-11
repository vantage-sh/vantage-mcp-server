import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific financial commitment report by its token.

Use this tool when you already have a financial commitment report token, such as one returned by
Vantage or referenced in the Vantage console. The response includes the report's title, workspace,
date range, grouping, cost scope, and filter configuration.
`.trim();

const args = {
  financial_commitment_report_token: z.string().min(1).describe("The financial commitment report token to retrieve"),
};

export default registerTool({
  name: "get-financial-commitment-report",
  title: "Get Financial Commitment Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/financial_commitment_reports/${pathEncode(args.financial_commitment_report_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
