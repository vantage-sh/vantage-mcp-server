import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { dateBucketSchema, filterSchema, groupingDescription, groupingsSchema, validateDateRange } from "./schemas";

const description = `
Queries cost, idle cost, and cost-efficiency data for a Kubernetes Efficiency Report. Omit overrides to use the report's saved configuration.
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
    start_date: dateValidator("Start date to query costs from, inclusive, YYYY-MM-DD.").optional(),
    end_date: dateValidator("End date to query costs through, inclusive, YYYY-MM-DD.").optional(),
    date_bin: dateBucketSchema.describe("Override the report's configured time bucket."),
    groupings: groupingsSchema.describe(`${groupingDescription} Overrides the report's saved groupings.`),
    filter: filterSchema.describe("VQL filter overriding the report's saved filter. Uses the kubernetes namespace."),
    order: z.enum(["asc", "desc"]).optional().describe("Order cost rows by date ascending or descending."),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
    limit: z.number().int().min(1).max(2500).optional().default(DEFAULT_LIMIT).describe("Number of cost rows per page"),
  },
  async execute(args, ctx) {
    validateDateRange(args);

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
