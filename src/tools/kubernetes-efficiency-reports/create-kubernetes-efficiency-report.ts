import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  aggregatedBySchema,
  createEndDateSchema,
  createStartDateSchema,
  dateBucketSchema,
  dateIntervalSchemaForCreate,
  filterSchema,
  groupingsSchema,
  validateCreateDateRange,
} from "./schemas";

const description = `
Creates a saved Kubernetes Efficiency Report for analyzing workload cost, idle cost, and cost efficiency.
`.trim();

export default registerTool({
  name: "create-kubernetes-efficiency-report",
  title: "Create Kubernetes Efficiency Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: vantageToken("workspace"),
    title: nonempty().describe("Title for the Kubernetes Efficiency Report."),
    filter: filterSchema,
    start_date: createStartDateSchema,
    end_date: createEndDateSchema,
    date_interval: dateIntervalSchemaForCreate,
    aggregated_by: aggregatedBySchema,
    date_bucket: dateBucketSchema,
    groupings: groupingsSchema,
  },
  async execute(args, ctx) {
    validateCreateDateRange(args);

    const response = await ctx.callVantageApi("/v2/kubernetes_efficiency_reports", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
