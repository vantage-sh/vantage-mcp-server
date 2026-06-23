import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";
import { PAGINATION_GUIDANCE } from "../utils/paginationGuidance";
import { BUSINESS_METRICS_LIMIT, businessMetricValueArgs } from "./schemas";

const description = `
Get forecasted values for a BusinessMetric.
Values are returned in descending date order by the Vantage API and can include optional labels.
Use start_date to limit results to values on or after a YYYY-MM-DD date.

${PAGINATION_GUIDANCE}

The API only supports a start_date lower bound. For bounded ranges, such as a specific month, fetch all pages from the requested start date and then filter the returned values to the requested end date locally.
`.trim();

export default registerTool({
  name: "get-business-metric-forecasted-values",
  title: "Get Business Metric Forecasted Values",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: businessMetricValueArgs,
  async execute(args, ctx) {
    const { business_metric_token, ...params } = args;
    const requestParams = { ...params, limit: BUSINESS_METRICS_LIMIT };
    const response = await ctx.callVantageApi(
      `/v2/business_metrics/${pathEncode(business_metric_token)}/forecasted_values`,
      requestParams,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      values: response.data.values,
      pagination: paginationData(response.data as { links?: { next?: string | null } | null }),
    };
  },
});
