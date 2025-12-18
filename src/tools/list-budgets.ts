import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all budgets available in the Vantage account. Budgets help track spending against predefined limits.
Use the page value of 1 to start.
A budget is built against a Cost Report. The Budget objects returned by this tool will have a "cost_report_token" field that contains the token of the Cost Report. The Cost Report has the "filter" field to know what is the range of providers & services that the budget is tracking.
When a user is looking at a Cost Report for a specific date range, they can decide if the providers and services spend is higher than desired by looking at the budgets for that report and the date range of the budget.
The token of a budget can be used to link the user to the budget in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<BudgetToken>
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-budgets",
	description,
	annotations: {
		destructive: false,
		openWorld: true,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/budgets", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			budgets: response.data.budgets,
			pagination: paginationData(response.data),
		};
	},
});
