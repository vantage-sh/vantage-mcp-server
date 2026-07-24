import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Billing Rule by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-billing-rule",
  title: "Delete Billing Rule",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  requires: { msp: true },
  args: {
    billing_rule_token: z.string().describe("The token of the Billing Rule to delete."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/billing_rules/${pathEncode(args.billing_rule_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.billing_rule_token };
  },
});
