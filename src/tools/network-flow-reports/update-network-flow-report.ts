import { pathEncode, type UpdateNetworkFlowReportRequest } from "@vantage-sh/vantage-client";
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
Updates an existing Network Flow Report's title, VQL filter, date range, groupings, traffic direction, or weighting metric. Use list-network-flow-reports to discover its token.
`.trim();

export default registerTool({
  name: "update-network-flow-report",
  title: "Update Network Flow Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    network_flow_report_token: z.string().min(1).describe("Token of the Network Flow Report to update."),
    title: z.string().min(1).optional().describe("Updated title for the Network Flow Report."),
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

    const { network_flow_report_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/network_flow_reports/${pathEncode(network_flow_report_token)}`,
      body as UpdateNetworkFlowReportRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
