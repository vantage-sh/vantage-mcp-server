import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific Budget by its token. Optionally includes performance data showing actual spend vs. budget amounts by period.
The token of a budget can be used to link the user to the budget in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<BudgetToken>
`.trim();

export default registerTool({
	name: "get-budget",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args: {
		budget_token: z.string().describe("The token of the Budget to retrieve."),
		include_performance: z
			.boolean()
			.optional()
			.describe(
				"If true, includes performance data showing actual spend vs. budget amounts by period."
			),
	},
	async execute(args, ctx) {
		const { budget_token, ...params } = args;
		const response = await ctx.callVantageApi(
			`/v2/budgets/${pathEncode(budget_token)}`,
			params,
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
