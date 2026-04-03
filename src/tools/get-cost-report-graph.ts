import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";

const description = `
Generates a PNG graph image of a cost report and returns a publicly accessible URL to the image.
This is useful when the user wants to see a visual chart of their costs.
To display the image in your response, include it as a markdown image: ![Cost Report: <title>](<image_url>)
The report token can be used to link the user to the report in the Vantage Web UI: https://console.vantage.sh/go/<CostReportToken>
`.trim();

const args = {
	cost_report_token: z.string().min(1).describe("Cost report token to generate graph for"),
	start_date: dateValidator("Start date for the graph, format=YYYY-MM-DD").optional(),
	end_date: dateValidator("End date for the graph, format=YYYY-MM-DD").optional(),
	date_bin: z
		.enum(["cumulative", "day", "week", "month", "quarter"])
		.optional()
		.describe("The date bin for the graph"),
	chart_type: z
		.enum(["line", "area", "stacked_area", "bar", "multi_bar", "stacked_bar", "pie"])
		.optional()
		.describe("The chart type for the graph"),
};

export default registerTool({
	name: "get-cost-report-graph",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = {
			start_date: args.start_date,
			end_date: args.end_date,
			date_bin: args.date_bin,
			chart_type: args.chart_type,
		};
		const response = await ctx.callVantageApi(
			`/v2/cost_reports/${pathEncode(args.cost_report_token)}/graph` as any,
			requestParams as any,
			"GET" as any
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data as any;
	},
});
