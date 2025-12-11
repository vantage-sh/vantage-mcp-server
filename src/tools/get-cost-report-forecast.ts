import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
Given a Cost Report Token, Vantage can forecast the costs for a given time range. Vantage will return costs that are *predicted*, but have not yet been actually incurred.
If the user does not set a date, best to pick the next month as the default.
The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>
`.trim();

const args = {
	cost_report_token: z.string().min(1).describe("Cost report to limit costs to"),
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	start_date: dateValidator("Start date to filter costs by, format=YYYY-MM-DD").optional(),
	end_date: dateValidator("End date to filter costs by, format=YYYY-MM-DD").optional(),
	provider: z
		.string()
		.optional()
		.describe("Provider to filter costs by, refer to the list-cost-providers tool"),
	service: z
		.string()
		.optional()
		.describe(
			"Service to filter costs by, refer to the list-cost-services tool, must pass a provider when you pass a service"
		),
};

export default registerTool({
	name: "get-cost-report-forecast",
	description,
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi(
			`/v2/cost_reports/${args.cost_report_token}/forecasted_costs`,
			requestParams,
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			forecasted_costs: response.data.forecasted_costs,
			pagination: paginationData(response.data),
		};
	},
});
