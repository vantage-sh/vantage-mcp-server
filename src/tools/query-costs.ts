import z from "zod";
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
To query on a cost service, use this syntax: (costs.provider = '<provider name>' AND costs.service = '<service name>').
For AWS, costs.service must be a CUR identifier (e.g. 'AmazonEC2', 'AmazonVPC', 'AWSDirectConnect'). Use vql_info to resolve aliases — not display names from list-cost-services.
If a query returns no rows, run one broad probe query first (provider only, date_bin=month, wide date range) to learn available months and service identifiers before retrying with a narrower filter.
For month-over-month comparisons, span both months in start_date/end_date with date_bin=month and settings_show_previous_period=true instead of separate queries per month.
Prefer one query-costs call with all needed groupings (e.g. service, account_id, tag:<key>) over multiple calls that only change groupings.
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

The DateBin parameter controls the time granularity of returned results.
When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
records. If omitted, DateBin defaults to day.

Cost settings (credits, refunds, discounts, tax, amortization, etc.) default to the workspace's default report settings.
Only provide these parameters if you need to override those defaults.
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
    .describe("Date binning for returned costs. Defaults to day if omitted. Allowed values: day, week, month."),
  settings_include_credits: z
    .boolean()
    .optional()
    .describe("Results will include credits. If not provided, the workspace's default report setting is used."),
  settings_include_refunds: z
    .boolean()
    .optional()
    .describe("Results will include refunds. If not provided, the workspace's default report setting is used."),
  settings_include_discounts: z
    .boolean()
    .optional()
    .describe("Results will include discounts. If not provided, the workspace's default report setting is used."),
  settings_include_tax: z
    .boolean()
    .optional()
    .describe("Results will include tax. If not provided, the workspace's default report setting is used."),
  settings_amortize: z
    .boolean()
    .optional()
    .describe("Results will amortize. If not provided, the workspace's default report setting is used."),
  settings_unallocated: z
    .boolean()
    .optional()
    .describe("Results will show unallocated costs. If not provided, the workspace's default report setting is used."),
  settings_aggregate_by: z
    .enum(["cost", "usage"])
    .optional()
    .describe(
      "Results will aggregate by cost or usage. If not provided, the workspace's default report setting is used."
    ),
  settings_show_previous_period: z
    .boolean()
    .optional()
    .describe(
      "Results will show previous period costs or usage comparison. If not provided, the workspace's default report setting is used."
    ),
  groupings: z
    .array(z.string())
    .default(["provider", "service", "region"])
    .describe(
      "Group the results by specific field(s). Defaults to provider, service, region. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>. Include every grouping you need in one call rather than issuing separate calls per grouping."
    ),
};

export default registerTool({
  name: "query-costs",
  title: "Query Costs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    // Build request params. Settings that are not explicitly provided are left out
    // so the API uses the workspace's default report settings.
    const requestParams: Record<string, unknown> = {
      limit: 1000,
    };
    for (const key of Object.keys(args)) {
      const typedKey = key as keyof typeof args;
      if (key.startsWith("settings_")) {
        const value = args[typedKey];
        if (value !== undefined) {
          const keyWithoutPrefix = key.slice("settings_".length);
          requestParams[`settings[${keyWithoutPrefix}]`] = value;
        }
      } else {
        requestParams[key] = args[typedKey];
      }
    }
    // /v2/costs expects groupings as a comma-joined string (coerce_with: CSV::parse_line),
    // not the bracket-suffix array format used by other endpoints.
    if (Array.isArray(requestParams.groupings)) {
      requestParams.groupings = (requestParams.groupings as string[]).join(",");
    }

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

    const costs = response.data.costs;
    const hint =
      costs.length === 0
        ? "No cost rows matched this filter and date range. Widen the date range, verify costs.service identifiers (vql_info or service values from a broad probe query), and avoid retrying with only a different groupings parameter."
        : undefined;

    return {
      costs,
      total_cost: response.data.total_cost,
      notes,
      ...(hint ? { hint } : {}),
      pagination: paginationData(response.data),
    };
  },
});
