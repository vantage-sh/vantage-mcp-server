import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Get the list of Cost Provider Accounts that the current user has access to in their workspace and their names.
This is useful for mapping IDs you have gotten from other endpoints to human-readable names, or if you need to get the
ID of a Cost Provider Account to use in places. The account_id in this result can be passed as the account_id in VQL queries.
`.trim();

export default registerTool({
	name: "get-cost-provider-accounts",
	description,
	args: {
		workspace_token: z.string().describe("Workspace token to list cost provider accounts for"),
		account_id: z.string().optional().describe("Filter by a specific account ID"),
		provider: z.string().optional().describe("Provider to filter provider accounts to"),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/v2/cost_provider_accounts", args, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			cost_provider_accounts: response.data.cost_provider_accounts,
		};
	},
});
