import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a financial commitment report by its token. This action is irreversible.
`.trim();

const args = {
  financial_commitment_report_token: z.string().describe("Token of the financial commitment report to delete"),
};

export default registerTool({
  name: "delete-financial-commitment-report",
  title: "Delete Financial Commitment Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/financial_commitment_reports/${pathEncode(args.financial_commitment_report_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.financial_commitment_report_token };
  },
});
