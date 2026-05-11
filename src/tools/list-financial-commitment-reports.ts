import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all financial commitment reports available in the Vantage account.
Use the page value of 1 to start.
`.trim();

const args = {
  page: z.number().optional().describe("The page number to return"),
  limit: z.number().optional().describe("The number of results per page"),
};

export default registerTool({
  name: "list-financial-commitment-reports",
  title: "List Financial Commitment Reports",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/financial_commitment_reports", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      financial_commitment_reports: response.data.financial_commitment_reports,
      pagination: paginationData(response.data),
    };
  },
});
