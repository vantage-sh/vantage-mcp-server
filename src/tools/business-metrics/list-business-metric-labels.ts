import { type GetBusinessMetricLabelsRequest, pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";
import { BUSINESS_METRIC_DATA_LIMIT } from "./schemas";

const description = `
List distinct label values for a BusinessMetric. For multi-label metrics, values are flattened across label keys.
Use this before get-business-metric-values when a label-dependent request does not provide confirmed exact label values.
This endpoint is paginated. If the user needs the complete set of labels, keep calling this tool with pagination.nextPage until pagination.hasNextPage is false.
`.trim();

const args = {
  business_metric_token: z
    .string()
    .min(1)
    .describe("The BusinessMetric token to list label values for. Use list-business-metrics to discover."),
  page: z.number().int().min(1).optional().default(1).describe("The page number to return, defaults to 1."),
};

export default registerTool({
  name: "list-business-metric-labels",
  title: "List Business Metric Labels",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const { business_metric_token, ...params } = args;
    const requestParams = { ...params, limit: BUSINESS_METRIC_DATA_LIMIT };
    const response = await ctx.callVantageApi(
      `/v2/business_metrics/${pathEncode(business_metric_token)}/labels`,
      requestParams as GetBusinessMetricLabelsRequest,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      labels: response.data.labels,
      pagination: paginationData(response.data),
    };
  },
});
