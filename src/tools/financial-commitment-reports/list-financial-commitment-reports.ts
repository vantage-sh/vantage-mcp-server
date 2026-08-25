import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List all financial commitment reports available in the Vantage account.
Use the page value of 1 to start.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  q: nonempty().optional().describe("Search Financial Commitment Reports by title."),
  workspace_token: vantageToken("workspace", {
    description: "Only return Financial Commitment Reports in this Workspace.",
  }).optional(),
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
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/financial_commitment_reports", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      financial_commitment_reports: response.data.financial_commitment_reports,
      pagination: paginationData(response.data),
    };
  },
});
