import { VANTAGE_PROVIDERS } from "@vantage-sh/vantage-client";
import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get Cost Provider Accounts in a workspace with human-readable titles.
Useful for mapping account IDs to names, or looking up an account_id for VQL.
`.trim();

export default registerTool({
  name: "get-cost-provider-accounts",
  title: "Get Cost Provider Accounts",
  description,
  args: {
    workspace_token: vantageToken("workspace"),
    account_id: nonempty().optional().describe("Filter by a specific account ID."),
    account_name: nonempty().optional().describe("Filter by account name (exact match)."),
    provider: z
      .enum(VANTAGE_PROVIDERS)
      .optional()
      .describe("Provider to filter provider accounts to. Use list-cost-providers to discover connected providers."),
    q: nonempty().optional().describe("Search Cost Provider Accounts by title."),
  },
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/cost_provider_accounts", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
