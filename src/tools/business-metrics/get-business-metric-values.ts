import { pathEncode } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../../utils/paginationData";
import { BUSINESS_METRIC_DATA_LIMIT, historicalBusinessMetricValueArgs } from "./schemas";

const description = `
Get historical values for a BusinessMetric.
Values default to monthly sums grouped by label. Use day for daily sums or raw to preserve original timestamps, including hourly values; binned sums may not suit gauges or percentages.
Values are returned in descending date order by the Vantage API and can include optional labels.
When a request depends on labels but exact values are not confirmed, call list-business-metric-labels first and pass the selected values through label_values. Skip label discovery when exact values are already supplied.
Use start_date to limit results to values on or after a YYYY-MM-DD date.
If the user asks for all values, complete data, or values for a date range such as a month, keep calling this tool with pagination.nextPage until pagination.hasNextPage is false before answering.
The API only supports a start_date lower bound. For bounded ranges, such as a specific month, fetch all pages from the requested start date and then filter the returned values to the requested end date locally.
`.trim();

export default registerTool({
  name: "get-business-metric-values",
  title: "Get Business Metric Values",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: historicalBusinessMetricValueArgs,
  async execute(args, ctx) {
    const { business_metric_token, date_bin, ...params } = args;
    const requestParams = {
      ...params,
      ...(date_bin === "raw" ? {} : { date_bin }),
      limit: BUSINESS_METRIC_DATA_LIMIT,
    };
    const response = await ctx.callVantageApi(
      `/v2/business_metrics/${pathEncode(business_metric_token)}/values`,
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
