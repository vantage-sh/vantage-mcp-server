import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
Retrieve the unit costs for a given CostReport, with optional paging, date filters, and ordering.
`.trim();

const args = {
	cost_report_token: z.string().optional().describe("CostReport token to list unit costs for"),
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	start_date: dateValidator("First date to filter unit costs from, format=YYYY-MM-DD").optional(),
	end_date: dateValidator("Last date to filter unit costs to, format=YYYY-MM-DD").optional(),
	date_bin: z
		.enum(["day", "week", "month"])
		.optional()
		.describe(
			"Date binning for returned costs, default to month unless user says otherwise, allowed values: day, week, month"
		),
	order: z
		.enum(["asc", "desc"])
		.optional()
		.default("desc")
		.describe("Order of the returned costs, defaults to desc"),
};

export default registerTool({
	name: "list-unit-costs",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: 64 };
		const response = await ctx.callVantageApi("/v2/unit_costs", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			unit_costs: response.data.unit_costs,
			pagination: paginationData(response.data),
		};
	},
});
