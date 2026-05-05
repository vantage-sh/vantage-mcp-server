import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Billing Profile by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-billing-profile",
  title: "Delete Billing Profile",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    billing_profile_token: z.string().describe("The token of the Billing Profile to delete."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/billing_profiles/${pathEncode(args.billing_profile_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.billing_profile_token };
  },
});
