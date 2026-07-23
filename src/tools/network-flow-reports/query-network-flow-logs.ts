import type { GetNetworkFlowLogsRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import dateValidator from "../../utils/dateValidator";
import paginationData from "../../utils/paginationData";
import {
  flowDirectionSchema,
  flowWeightSchemaForUpdate,
  networkFlowReportGroupingOptions,
  networkFlowReportRelativeDateIntervals,
} from "./schemas";

const description = `
Queries aggregated network flow log data (costs and bytes). Pass a saved report token or an ad hoc filter. Unlike create/update, custom date ranges use start_date and end_date without date_interval=custom.
`.trim();

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
      .describe("Saved Network Flow Report token. Use list-network-flow-reports to discover."),
    workspace_token: z
      .string()
      .min(1)
      .optional()
      .describe("Workspace token. Required for ad hoc queries; use get-myself to discover."),
    filter: z
      .string()
      .min(1)
      .optional()
      .describe("Ad hoc VQL filter or override for a saved report. Uses the network_flow_logs namespace."),
    date_interval: z
      .enum(networkFlowReportRelativeDateIntervals)
      .optional()
      .describe("Relative date interval. Incompatible with start_date and end_date."),
    start_date: dateValidator(
      "Custom range start date, YYYY-MM-DD. Provide end_date and omit date_interval."
    ).optional(),
    end_date: dateValidator("Custom range end date, YYYY-MM-DD. Provide start_date and omit date_interval.").optional(),
    groupings: z
      .array(z.enum(networkFlowReportGroupingOptions))
      .min(1)
      .refine((values) => new Set(values).size === values.length, {
        error: "groupings must contain unique values",
      })
      .optional()
      .describe("Dimensions used to group network traffic."),
    flow_direction: flowDirectionSchema.describe("Override the saved report's traffic direction."),
    flow_weight: flowWeightSchemaForUpdate.describe("Override the saved report's ordering metric."),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
    limit: z.number().int().min(1).max(1000).optional().default(DEFAULT_LIMIT).describe("Number of rows per page"),
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

    const response = await ctx.callVantageApi("/v2/network_flow_logs", args as GetNetworkFlowLogsRequest, "GET");
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
