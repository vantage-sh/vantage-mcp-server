import type { CreateNetworkFlowReportRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  dateIntervalSchema,
  endDateSchema,
  filterSchema,
  flowDirectionSchema,
  flowWeightSchema,
  groupingsSchema,
  startDateSchema,
  validateNetworkFlowReportDateRange,
} from "./schemas";

const description = `
Creates a Network Flow Report to analyze ingress or egress cloud network traffic by cost or bytes. Use get-myself to discover workspace tokens; VQL filters use the network_flow_logs namespace.
`.trim();

export default registerTool({
  name: "create-network-flow-report",
  title: "Create Network Flow Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: z
      .string()
      .min(1)
      .describe("Workspace token where the Network Flow Report will be created. Use get-myself to discover."),
    title: z.string().min(1).describe("Title for the new Network Flow Report."),
    filter: filterSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: dateIntervalSchema,
    groupings: groupingsSchema,
    flow_direction: flowDirectionSchema,
    flow_weight: flowWeightSchema,
  },
  async execute(args, ctx) {
    validateNetworkFlowReportDateRange(args);

    const response = await ctx.callVantageApi(
      "/v2/network_flow_reports",
      args as CreateNetworkFlowReportRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
