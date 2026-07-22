import type { CreateNetworkFlowReportRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  dateIntervalSchemaForCreate,
  endDateSchema,
  filterSchema,
  flowDirectionSchema,
  flowWeightSchemaForCreate,
  groupingsSchema,
  startDateSchema,
  validateNetworkFlowReportDateRange,
} from "./schemas";

const description = `
Creates a saved Network Flow Report for analyzing cloud network traffic by cost or bytes.
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
    workspace_token: z.string().min(1).describe("Workspace token. Use get-myself to discover."),
    title: z.string().min(1).describe("Title for the Network Flow Report."),
    filter: filterSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: dateIntervalSchemaForCreate,
    groupings: groupingsSchema,
    flow_direction: flowDirectionSchema,
    flow_weight: flowWeightSchemaForCreate,
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
