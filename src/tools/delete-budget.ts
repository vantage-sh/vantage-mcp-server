import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Deletes a Budget by its token. This action is irreversible.
`.trim();

export default registerTool({
	name: "delete-budget",
	description,
	annotations: {
		destructive: true,
		openWorld: false,
		readOnly: false,
	},
	args: {
		budget_token: z.string().describe("The token of the Budget to delete."),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/budgets/${pathEncode(args.budget_token)}`,
			{},
			"DELETE"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return { token: args.budget_token };
	},
});
