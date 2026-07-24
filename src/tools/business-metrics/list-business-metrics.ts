import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../../utils/paginationData";
import { BUSINESS_METRICS_LIST_LIMIT } from "./schemas";

const description = `
List all BusinessMetrics available to the current Vantage API token.
If the user asks for all BusinessMetrics or needs to search across the full set, keep calling this tool with pagination.nextPage until pagination.hasNextPage is false.
BusinessMetrics represent business KPIs, such as requests, users, or revenue, that can be attached to Cost Reports for per-unit cost analysis.
The token of a BusinessMetric can be used with get-business-metric, list-business-metric-labels, get-business-metric-values, and get-business-metric-forecasted-values.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
};

export default registerTool({
  name: "list-business-metrics",
  title: "List Business Metrics",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: BUSINESS_METRICS_LIST_LIMIT };
    const response = await ctx.callVantageApi("/v2/business_metrics", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      business_metrics: response.data.business_metrics,
      pagination: paginationData(response.data as { links?: { next?: string | null } | null }),
    };
  },
});
