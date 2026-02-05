import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all cost alerts available in the Vantage account. Cost alerts notify you when spending exceeds a specified threshold for a given cost report.
Use the page value of 1 to start.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-cost-alerts",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/cost_alerts", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			cost_alerts: response.data.cost_alerts,
			pagination: paginationData(response.data),
		};
	},
});
