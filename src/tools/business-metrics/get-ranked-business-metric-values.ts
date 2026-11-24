import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { businessMetricValueArgs } from "./schemas";

export default registerTool({
  name: "get-ranked-business-metric-values",
  title: "Get Ranked Business Metric Values",
  description:
    "For a top-N breakdown of an additive business metric, rank labels by their total over the inclusive date range and return their monthly sums. Amounts in each series and monthly_totals follow the months array. monthly_totals includes all labels, including those outside the top N. Use those totals for each month's percentage share. Supports up to 12 calendar months.",
  annotations: { destructive: false, openWorld: false, readOnly: true },
  args: {
    business_metric_token: businessMetricValueArgs.business_metric_token,
    start_date: dateValidator("First date to include (YYYY-MM-DD)."),
    end_date: dateValidator("Last date to include (YYYY-MM-DD)."),
    top_labels: z.number().int().min(1).max(100).describe("Number of highest-total labels to return."),
  },
  outputSchema: {
    months: z.array(z.string()),
    monthly_totals: z.array(z.string()),
    series: z.array(z.object({ label: z.string(), amounts: z.array(z.string()) })),
  },
  async execute({ business_metric_token, ...params }, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/business_metrics/${pathEncode(business_metric_token)}/ranked_values`,
      params,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
