import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Billing Rule by its token. Returns details about the rule including its type, configuration, and applicable dates.
`.trim();

export default registerTool({
  name: "get-billing-rule",
  title: "Get Billing Rule",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  requires: { msp: true },
  args: {
    billing_rule_token: z.string().describe("The token of the Billing Rule to retrieve."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/billing_rules/${pathEncode(args.billing_rule_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
