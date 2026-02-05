import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
List the cost items inside a report. The Token of a Report must be provided. Use the page value of 1 to start.
The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>

The DateBin parameter will let you get the information with fewer returned results.
When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
records. Only use day/week if needed, otherwise DateBin=month is preferred, and month is the value set if you pass no value for DateBin.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	cost_report_token: z.string().describe("The workspace token to scope the query to"),
	start_date: dateValidator("Start date to filter costs by, format=YYYY-MM-DD").optional(),
	end_date: dateValidator("End date to filter costs by, format=YYYY-MM-DD").optional(),
	date_bin: z
		.enum(["day", "week", "month"])
		.optional()
		.describe(
			"Date binning for returned costs, default to month unless user says otherwise, allowed values: day, week, month"
		),
	settings_include_credits: z
		.boolean()
		.optional()
		.default(false)
		.describe("Results will include credits, defaults to false"),
	settings_include_refunds: z
		.boolean()
		.optional()
		.default(false)
		.describe("Results will include refunds, defaults to false"),
	settings_include_discounts: z
		.boolean()
		.optional()
		.default(true)
		.describe("Results will include discounts, defaults to true"),
	settings_include_tax: z
		.boolean()
		.optional()
		.default(true)
		.describe("Results will include tax, defaults to true"),
	settings_amortize: z
		.boolean()
		.optional()
		.default(true)
		.describe("Results will amortize, defaults to true"),
	settings_unallocated: z
		.boolean()
		.optional()
		.default(false)
		.describe("Results will show unallocated costs, defaults to false"),
	settings_aggregate_by: z
		.enum(["cost", "usage"])
		.optional()
		.default("cost")
		.describe("Results will aggregate by cost or usage, defaults to cost"),
	settings_show_previous_period: z
		.boolean()
		.optional()
		.default(true)
		.describe("Results will show previous period costs or usage comparison, defaults to true"),
	groupings: z
		.array(z.string())
		.default(["provider", "service", "account_id"])
		.describe(
			"Group the results by specific field(s). Defaults to provider, service, account_id. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>. Let Groupings default unless explicitly asked for."
		),
};

export default registerTool({
	name: "list-costs",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		// Every arg we get needs to be in requestParams, but under 'settings' if it has that prefix.
		const requestParams: Record<string, any> = {
			limit: DEFAULT_LIMIT,
		};
		Object.keys(args).forEach((key) => {
			const typedKey = key as keyof typeof args;
			if (key.startsWith("settings_")) {
				const keyWithoutPrefix = key.slice("settings_".length);
				requestParams[`settings[${keyWithoutPrefix}]`] = args[typedKey];
			} else {
				requestParams[key] = args[typedKey];
			}
		});
		const response = await ctx.callVantageApi("/v2/costs", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}

		let notes: string;
		switch (args.date_bin) {
			case "day":
				notes = "Costs records represent one day.";
				break;
			case "week":
				notes =
					"Costs records represent one week, the accrued_at field is the first day of the week. If your date range is less than one week, this record includes only data for that date range, not the full week.";
				break;
			case "month":
				notes =
					"Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.";
				break;
			default:
				notes = "Costs records represent one day.";
				break;
		}

		return {
			costs: response.data.costs,
			total_cost: response.data.total_cost,
			notes,
			pagination: paginationData(response.data),
		};
	},
});
