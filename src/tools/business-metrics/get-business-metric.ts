import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get a specific BusinessMetric by token.
BusinessMetrics can be attached to Cost Reports for per-unit cost analysis, and their values can be retrieved with get-business-metric-values or get-business-metric-forecasted-values.
`.trim();

const args = {
  business_metric_token: z.string().describe("The BusinessMetric token to retrieve."),
};

export default registerTool({
  name: "get-business-metric",
  title: "Get Business Metric",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/business_metrics/${pathEncode(args.business_metric_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
