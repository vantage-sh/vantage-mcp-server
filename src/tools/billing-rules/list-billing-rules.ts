import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";
import { PAGINATION_GUIDANCE } from "../utils/paginationGuidance";

const description = `
List all billing rules available in the Vantage account. Billing rules allow you to adjust, exclude, or add charges to your cost data.

${PAGINATION_GUIDANCE}
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
  name: "list-billing-rules",
  title: "List Billing Rules",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/billing_rules", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      billing_rules: response.data.billing_rules,
      pagination: paginationData(response.data),
    };
  },
});
