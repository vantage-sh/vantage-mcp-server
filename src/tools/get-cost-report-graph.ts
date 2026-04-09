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
	date_interval: z
		.string()
		.optional()
		.describe(
			"Date interval for the graph (e.g. 'this_month', 'last_month', 'last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_12_months'). Incompatible with start_date/end_date."
		),
	date_bin: z
		.enum(["cumulative", "day", "week", "month", "quarter"])
		.optional()
		.describe("The date bin for the graph"),
	chart_type: z
		.enum(["line", "area", "stacked_area", "bar", "multi_bar", "stacked_bar", "pie"])
		.optional()
		.describe("The chart type for the graph"),
	groupings: z
		.string()
		.optional()
		.describe(
			"Comma-separated grouping values for aggregating costs (e.g. 'provider,service,region')"
		),
	filter: z
		.string()
		.optional()
		.describe(
			"VQL filter expression to apply to the graph (e.g. \"costs.provider = 'aws'\")"
		),
	saved_filter_tokens: z
		.array(z.string())
		.optional()
		.describe("Tokens of SavedFilters to apply to the graph"),
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
		const requestParams: Record<string, unknown> = {};
		if (args.start_date) requestParams.start_date = args.start_date;
		if (args.end_date) requestParams.end_date = args.end_date;
		if (args.date_interval) requestParams.date_interval = args.date_interval;
		if (args.date_bin) requestParams.date_bin = args.date_bin;
		if (args.chart_type) requestParams.chart_type = args.chart_type;
		if (args.groupings) requestParams.groupings = args.groupings;
		if (args.filter) requestParams.filter = args.filter;
		if (args.saved_filter_tokens) requestParams.saved_filter_tokens = args.saved_filter_tokens;
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
