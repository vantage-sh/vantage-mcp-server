import z from "zod";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
List the cost items inside a report. The Token of a Report must be provided. Use the page value of 1 to start.
The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>

The DateBin parameter controls the time granularity of returned results.
When DateBin=day you get a record for each service spend on that day. For DateBin=week you get one entry per week,
with the accrued_at field set to the first day of the week, but the spend item represents spend for a full week.
Same with DateBin=month, each record returned covers a month of data. This lets you get answers with processing fewer
records. If omitted, the API uses the cost report's configured date bin, or day if the report has no override.

Cost settings (credits, refunds, discounts, tax, amortization, etc.) default to the report's own settings.
Only provide these parameters if you need to override the report's defaults.
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
      "Date binning for returned costs. If omitted, the API uses the cost report's configured date bin, or day if the report has no override. Allowed values: day, week, month."
    ),
  settings_include_credits: z
    .boolean()
    .optional()
    .describe("Results will include credits. If not provided, the report's setting is used."),
  settings_include_refunds: z
    .boolean()
    .optional()
    .describe("Results will include refunds. If not provided, the report's setting is used."),
  settings_include_discounts: z
    .boolean()
    .optional()
    .describe("Results will include discounts. If not provided, the report's setting is used."),
  settings_include_tax: z
    .boolean()
    .optional()
    .describe("Results will include tax. If not provided, the report's setting is used."),
  settings_amortize: z
    .boolean()
    .optional()
    .describe("Results will amortize. If not provided, the report's setting is used."),
  settings_unallocated: z
    .boolean()
    .optional()
    .describe("Results will show unallocated costs. If not provided, the report's setting is used."),
  settings_aggregate_by: z
    .enum(["cost", "usage"])
    .optional()
    .describe("Results will aggregate by cost or usage. If not provided, the report's setting is used."),
  settings_show_previous_period: z
    .boolean()
    .optional()
    .describe(
      "Results will show previous period costs or usage comparison. If not provided, the report's setting is used."
    ),
  groupings: z
    .string()
    .default("provider,service,account_id")
    .describe(
      "Comma-separated grouping dimensions. Defaults to \"provider,service,account_id\". Valid values: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>. Let groupings default unless explicitly asked for."
    ),
};

export default registerTool({
  name: "list-costs",
  title: "List Costs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    // Build request params. Settings that are not explicitly provided are left out
    // so the API uses the cost report's own configured settings.
    const requestParams: Record<string, any> = {
      limit: DEFAULT_LIMIT,
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
        notes =
          "No date_bin was specified; the API will use the cost report's configured date bin (defaulting to day). Each cost record's time span depends on that setting.";
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
