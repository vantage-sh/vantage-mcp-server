import z from "zod/v4";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List all billing profiles available in the Vantage account. Billing profiles contain billing, business, banking, and invoice adjustment information.
Use the page value of 1 to start.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
  name: "list-billing-profiles",
  title: "List Billing Profiles",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/billing_profiles", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      billing_profiles: response.data.billing_profiles,
      pagination: paginationData(response.data),
    };
  },
});
