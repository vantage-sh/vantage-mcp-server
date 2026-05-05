import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Billing Profile by its token. Returns billing, business, banking, and invoice adjustment information.
`.trim();

export default registerTool({
  name: "get-billing-profile",
  title: "Get Billing Profile",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    billing_profile_token: z.string().describe("The token of the Billing Profile to retrieve."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/billing_profiles/${pathEncode(args.billing_profile_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
