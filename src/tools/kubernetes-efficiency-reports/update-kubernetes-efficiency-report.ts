import { pathEncode } from "@vantage-sh/vantage-client";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  aggregatedBySchema,
  dateBucketSchema,
  dateIntervalSchema,
  endDateSchema,
  filterSchema,
  groupingsSchema,
  startDateSchema,
  validateDateRange,
} from "./schemas";

const description = `
Updates a saved Kubernetes Efficiency Report.
`.trim();

export default registerTool({
  name: "update-kubernetes-efficiency-report",
  title: "Update Kubernetes Efficiency Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    kubernetes_efficiency_report_token: vantageToken("kubernetes_efficiency_report"),
    title: nonempty().optional().describe("Updated title for the Kubernetes Efficiency Report."),
    filter: filterSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: dateIntervalSchema,
    aggregated_by: aggregatedBySchema,
    date_bucket: dateBucketSchema,
    groupings: groupingsSchema,
  },
  async execute(args, ctx) {
    validateDateRange(args);

    const { kubernetes_efficiency_report_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/kubernetes_efficiency_reports/${pathEncode(kubernetes_efficiency_report_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
