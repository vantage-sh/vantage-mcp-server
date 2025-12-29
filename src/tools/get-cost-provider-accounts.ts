import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import { GetCostProviderAccountsRequest } from "../../vantage-ts";

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
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/cost_provider_accounts", {
			...args,
			// @ts-expect-error: This is a workaround so we don't have to keep patching the type here
			provider: args.provider,
		}, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			cost_provider_accounts: response.data.cost_provider_accounts,
		};
	},
});
