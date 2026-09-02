import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { costGroupingDescription, costGroupingSchema } from "./schemas";

const description = `
Query cost data for a Financial Commitment Report. Use get-financial-commitment-report or
list-financial-commitment-reports to obtain a report token. Omit date_bin, groupings, filter, and
on_demand_costs_scope to use the report's saved configuration.

DateBin controls time granularity. When DateBin=day each record represents one day; week and month
behave similarly with accrued_at set to the period start. Hourly costs are limited to 14 days.
If omitted, the report's configured date bucket is used.
`.trim();

const args = {
  financial_commitment_report_token: vantageToken("financial_commitment_report"),
  page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
  start_date: dateValidator("Start date to filter costs by, format=YYYY-MM-DD").optional(),
  end_date: dateValidator("End date to filter costs by, format=YYYY-MM-DD").optional(),
  date_bin: z
    .enum(["hour", "day", "week", "month", "quarter"])
    .optional()
    .describe(
      "Date binning for returned costs. If omitted, the report's configured date bucket is used. Hourly costs are limited to 14 days."
    ),
  groupings: z
    .array(costGroupingSchema)
    .optional()
    .describe(
      `${costGroupingDescription} If omitted, the report's configured groupings are used.`
    ),
  filter: z
    .string()
    .optional()
    .describe(
      "VQL filter overriding the report's saved filter. Uses the financial_commitments namespace — see the VQL for Financial Commitment Reports resource."
    ),
  on_demand_costs_scope: z
    .enum(["discountable", "all"])
    .optional()
    .describe(
      "Scope for on-demand costs: discountable or all. If omitted, the report's configured scope is used."
    ),
  order: z.enum(["asc", "desc"]).optional().describe("Order costs by date ascending or descending"),
};

export default registerTool({
  name: "query-financial-commitment-report-costs",
  title: "Query Financial Commitment Report Costs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const { financial_commitment_report_token, ...queryParams } = args;
    const requestParams: Record<string, unknown> = {
      ...queryParams,
      limit: DEFAULT_LIMIT,
    };
    if (Array.isArray(requestParams.groupings)) {
      requestParams.groupings = (requestParams.groupings as string[]).join(",");
    }

    const response = await ctx.callVantageApi(
      `/v2/financial_commitment_reports/${pathEncode(financial_commitment_report_token)}/costs`,
      requestParams,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }

    let notes: string;
    switch (args.date_bin) {
      case "hour":
        notes = "Costs records represent one hour. Hourly costs are limited to a 14-day date range.";
        break;
      case "day":
        notes = "Costs records represent one day.";
        break;
      case "week":
        notes =
          "Costs records represent one week; accrued_at is the first day of the week. If your date range is shorter than a week, the record covers only that range.";
        break;
      case "month":
        notes =
          "Costs records represent one month; accrued_at is the first day of the month. If your date range is shorter than a month, the record covers only that range.";
        break;
      case "quarter":
        notes =
          "Costs records represent one quarter; accrued_at is the first day of the quarter. If your date range is shorter than a quarter, the record covers only that range.";
        break;
      default:
        notes =
          "No date_bin was specified; the API uses the report's configured date bucket. Each cost record's time span depends on that setting.";
        break;
    }

    return {
      costs: response.data.costs,
      total_amount: response.data.total_amount,
      total_gross_amount: response.data.total_gross_amount,
      notes,
      pagination: paginationData(response.data),
    };
  },
});
