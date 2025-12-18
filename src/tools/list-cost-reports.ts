import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all cost reports available. Cost reports are already created reports authored by a user in Vantage. If the user isn't asking about a specific report, it's better to use the query-costs tool.
When you first call this function, use the "Page" parameter of 1.
The 'Title' of a report is a good way to know what the report is about.
The 'filter' of a report also gives clues to the data it provides.
The 'token' of a report is a unique identifier for the report. It can be used to generate a link to the report in the Vantage Web UI. If a user wants to see a report, you can link them like this: https://console.vantage.sh/go/<token>
Vantage offers data related to a cost report: Forecasts. The same report token can be used on the get-cost-report-forecast tool and Vantage will forecast future costs.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-cost-reports",
	description,
	annotations: {
		destructive: false,
		openWorld: true,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/cost_reports", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			cost_reports: response.data.cost_reports,
			pagination: paginationData(response.data),
		};
	},
});
