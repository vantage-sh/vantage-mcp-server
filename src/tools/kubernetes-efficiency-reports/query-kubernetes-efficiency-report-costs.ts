import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  dateBucketSchema,
  filterSchema,
  groupingDescription,
  groupingsSchema,
  validateQueryDateRange,
} from "./schemas";

const description = `
Queries cost, idle cost, and cost-efficiency data for a Kubernetes Efficiency Report. Omit overrides to use the report's saved configuration.
The accrued_at field is the start date of each aggregation bucket, not necessarily a date within the requested range.
Weekly buckets follow calendar boundaries in the effective time zone, so querying September 1–7 can return bucket starts of August 31 and September 7.
`.trim();

export default registerTool({
  name: "query-kubernetes-efficiency-report-costs",
  title: "Query Kubernetes Efficiency Report Costs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    kubernetes_efficiency_report_token: vantageToken("kubernetes_efficiency_report"),
    start_date: dateValidator("Optional start date override for this query, inclusive, YYYY-MM-DD.").optional(),
    end_date: dateValidator("Optional end date override for this query, inclusive, YYYY-MM-DD.").optional(),
    date_bin: dateBucketSchema.describe(
      "Time bucket for this query only. Overrides the saved report's date_bucket without modifying the report."
    ),
    groupings: groupingsSchema.describe(`${groupingDescription} Overrides the report's saved groupings.`),
    filter: filterSchema,
    order: z.enum(["asc", "desc"]).optional().describe("Order cost rows by date ascending or descending."),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
    limit: z.number().int().min(1).max(2500).optional().default(DEFAULT_LIMIT).describe("Number of cost rows per page"),
  },
  async execute(args, ctx) {
    validateQueryDateRange(args);

    const { kubernetes_efficiency_report_token, ...query } = args;
    const requestParams: Record<string, unknown> = { ...query };
    if (Array.isArray(requestParams.groupings)) {
      requestParams.groupings = (requestParams.groupings as string[]).join(",");
    }

    const response = await ctx.callVantageApi(
      `/v2/kubernetes_efficiency_reports/${pathEncode(kubernetes_efficiency_report_token)}/costs`,
      requestParams,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }

    return {
      costs: response.data.costs,
      total_amount: response.data.total_amount,
      total_idle_cost: response.data.total_idle_cost,
      total_cost_efficiency: response.data.total_cost_efficiency,
      pagination: paginationData(response.data),
    };
  },
});
