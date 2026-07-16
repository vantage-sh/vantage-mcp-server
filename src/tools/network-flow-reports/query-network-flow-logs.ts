import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import dateValidator from "../utils/dateValidator";
import paginationData from "../utils/paginationData";
import { networkFlowReportGroupingOptions, networkFlowReportRelativeDateIntervals } from "./schemas";
import {
  NETWORK_FLOW_LOGS_ENDPOINT,
  type TemporaryCallNetworkFlowLogsApi,
  type TemporaryNetworkFlowLogsRequest,
} from "./temporary-network-flow-logs-types";

const description = `
Queries aggregated Network Flow Log data, including estimated costs and bytes, from a saved Network Flow Report or an ad hoc VQL query. Use list-network-flow-reports and get-network-flow-report for saved report configuration rather than result data.
`.trim();

const groupingDescription = `Dimensions used to aggregate network traffic. Valid values: ${networkFlowReportGroupingOptions.join(", ")}.`;

export default registerTool({
  name: "query-network-flow-logs",
  title: "Query Network Flow Logs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    network_flow_report_token: z
      .string()
      .min(1)
      .optional()
      .describe("Saved Network Flow Report token to query. Use list-network-flow-reports to discover."),
    workspace_token: z
      .string()
      .min(1)
      .optional()
      .describe("Workspace token. Required for ad hoc queries; use get-myself to discover."),
    filter: z
      .string()
      .min(1)
      .optional()
      .describe("Ad hoc or override VQL filter using the network_flow_logs namespace."),
    date_interval: z
      .enum(networkFlowReportRelativeDateIntervals)
      .optional()
      .describe("Relative date interval. Incompatible with start_date and end_date."),
    start_date: dateValidator(
      "Custom range start date, formatted YYYY-MM-DD. Provide end_date and omit date_interval."
    ).optional(),
    end_date: dateValidator(
      "Custom range end date, formatted YYYY-MM-DD. Provide start_date and omit date_interval."
    ).optional(),
    groupings: z
      .array(z.enum(networkFlowReportGroupingOptions))
      .min(1)
      .refine((values) => new Set(values).size === values.length, {
        error: "groupings must contain unique values",
      })
      .optional()
      .describe(groupingDescription),
    flow_direction: z
      .enum(["all", "ingress", "egress"])
      .optional()
      .describe("Network traffic direction to include: all, ingress, or egress."),
    flow_weight: z
      .enum(["costs", "bytes"])
      .optional()
      .describe("Metric used to order aggregated rows: costs or bytes."),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(DEFAULT_LIMIT)
      .describe(`Number of rows per page, defaults to ${DEFAULT_LIMIT} and cannot exceed 1000.`),
  },
  async execute(args, ctx) {
    if (!args.network_flow_report_token && !args.filter) {
      throw new MCPUserError({
        errors: [{ message: "network_flow_report_token or filter is required" }],
      });
    }

    if (!args.network_flow_report_token) {
      if (!args.workspace_token) {
        throw new MCPUserError({
          errors: [{ message: "workspace_token is required for an ad hoc Network Flow Log query" }],
        });
      }
      if (!args.date_interval && !args.start_date) {
        throw new MCPUserError({
          errors: [{ message: "date_interval or start_date and end_date are required for an ad hoc query" }],
        });
      }
    }

    if (!!args.start_date !== !!args.end_date) {
      throw new MCPUserError({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    }

    if (args.date_interval !== undefined && args.start_date !== undefined) {
      throw new MCPUserError({
        errors: [{ message: "date_interval cannot be used together with start_date or end_date" }],
      });
    }

    if (args.start_date !== undefined && args.end_date !== undefined && args.start_date > args.end_date) {
      throw new MCPUserError({
        errors: [{ message: "start_date must be on or before end_date" }],
      });
    }

    // Temporary boundary cast: the endpoint is live in core#20392 before it exists in vantage-client.
    const callNetworkFlowLogsApi = ctx.callVantageApi as unknown as TemporaryCallNetworkFlowLogsApi;
    const response = await callNetworkFlowLogsApi(
      NETWORK_FLOW_LOGS_ENDPOINT,
      args as TemporaryNetworkFlowLogsRequest,
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }

    return {
      network_flow_logs: response.data.network_flow_logs,
      flow_weight: response.data.flow_weight,
      sampling: response.data.sampling,
      pagination: paginationData(response.data),
    };
  },
});
