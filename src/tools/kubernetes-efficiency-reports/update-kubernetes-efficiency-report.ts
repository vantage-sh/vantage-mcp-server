import { pathEncode } from "@vantage-sh/vantage-client";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  aggregatedBySchema,
  dateBucketSchema,
  dateIntervalSchemaForUpdate,
  filterSchema,
  groupingsSchema,
  updateEndDateSchema,
  updateStartDateSchema,
  validateUpdateDateRange,
} from "./schemas";

const description = `
Updates a saved Kubernetes Efficiency Report. Omitted fields preserve the existing report configuration.
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
    start_date: updateStartDateSchema,
    end_date: updateEndDateSchema,
    date_interval: dateIntervalSchemaForUpdate,
    aggregated_by: aggregatedBySchema,
    date_bucket: dateBucketSchema,
    groupings: groupingsSchema,
  },
  async execute(args, ctx) {
    validateUpdateDateRange(args);

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
