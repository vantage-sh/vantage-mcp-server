import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
Query for costs in a Vantage Account. These are independent of a cost reports.
Use Vantage VQL to structure a query.
Queries must be scoped to a Workspace. Use the get-myself tool to know about available workspaces, and the get-cost-integrations tool to know about available cost providers. If the user didn't tell you a workspace it is best to ask them than to guess it.
It's best to set a date range of 30 days unless the user specifically wants to query for a longer time period.

When a user asks for data from an account, use the "get-cost-provider-accounts" tool to match a name to an account. With that result, always use the account_id in the account_id parameter for this tool. 

Here is some more detailed info on using VQL:
All costs originate from a Cost Provider (generally a cloud company like AWS, Azure, Datadog) and then filter on a service that they provide (like EC2, S3, etc).
A cost provider is required on every VQL query.
VQL is always in parenthesis. Always use single quotes around names that are being queried.
To query on a cost provider, use this syntax: (costs.provider = '<provider name>'). The provider name must come from the list-cost-providers tool.
To query on a cost service, use this syntax: (costs.provider = '<provider name>' AND costs.service = '<service name>'). The service name must come from the list-cost-services tool.
For the AWS provider, always use short names for the services. example: Use 'AmazonEC2' not 'Amazon Elastic Compute Cloud' and 'AmazonRDS' not 'Amazon Relational Database Service'. Again the list-cost-services tool in this MCP can give accurate service names.
You can only filter against one cost provider at a time. If you want to query for costs from two providers, you need to use the OR operator. Example: ((costs.provider = 'aws') OR (costs.provider = 'azure'))
You can otherwise use the IN system to compare against a list of items, like this: (costs.provider = 'aws' AND costs.service IN ('AWSQueueService', 'AWSLambda'))
To filter within a cost provider, keep the cost provider part and add a AND section, example: (costs.provider = 'aws' AND costs.service = 'AmazonRDS')
Many costs have tags on them. A tag is a "name" and one or more values.
To find an AWS cost that has a tag of "environment" the value "production", use this syntax: (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')
You can also query for any value of the "environment" tag, like this: (costs.provider = 'aws' AND tags.name = 'environment')
Items without a tag can also be filtered, example: (costs.provider = 'aws' AND tags.name = NULL)
Parenthesis can be nested. Here we surround an OR clause to look for either of two values for a tag: (costs.provider = 'aws' AND tags.name = 'environment' AND (tags.value = 'dev' OR tags.value = 'staging'))
A user can have more than one provider account. They can filter on provider accounts if they supply you with the account id. Example: (costs.provider = 'aws' AND costs.account_id = '1000000717')
You can also combine top-level queries to find for two providers: ((costs.provider = 'datadog') OR (costs.provider = 'azure'))
Some cost providers operate in a specific region, you can filter using the costs.region field. Example: (costs.provider = 'aws' AND costs.region = 'us-east-1')
Note that when users want to query a Custom Provider, that has a special case. When doing a VQL query for custom provider, use the 'token' you get back from the 'list-cost-integrations' tool. Here is an example, where the token of the custom provider is "accss_crdntl_07171984": 
  (costs.provider = 'custom_provider:accss_crdntl_07171984')

The DateBin parameter will let you get the information with fewer returned results.
When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
records. Only use day/week if needed, otherwise DateBin=month is preferred, and month is the value set if you pass no value for DateBin.
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	filter: z.string().describe("A VQL query to run against your vantage account"),
	start_date: dateValidator("Start date to filter costs by, format=YYYY-MM-DD").optional(),
	end_date: dateValidator("End date to filter costs by, format=YYYY-MM-DD").optional(),
	workspace_token: z.string().min(1).describe("The workspace token to scope the query to"),
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
		.default(["provider", "service", "region"])
		.transform((v) => v.join(","))
		.describe(
			"Group the results by specific field(s). Defaults to provider, service, account_id. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>. Let Groupings default unless explicitly asked for."
		),
};

export default registerTool({
	name: "query-costs",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams: Record<string, unknown> = {
			limit: 1000,
		};
		if (!args.date_bin) args.date_bin = "month";

		// Every arg we get needs to be in requestParams, but under 'settings' if it has that prefix.
		Object.keys(args).forEach((key) => {
			const typedKey = key as keyof typeof args;
			if (key.startsWith("settings_")) {
				const keyWithoutPrefix = key.slice("settings_".length);
				requestParams[`settings[${keyWithoutPrefix}]`] = args[typedKey];
			} else {
				requestParams[key] = args[typedKey];
			}
		});

		const response = await ctx.callVantageApi("/costs", requestParams, "GET");
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
				throw new Error("Invalid date bin value");
		}

		return {
			costs: response.data.costs,
			total_cost: response.data.total_cost,
			notes,
			pagination: paginationData(response.data),
		};
	},
});
