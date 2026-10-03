import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { paginationSchema } from "../../utils/zod/output";
import MCPUserError from "../structure/MCPUserError";

export const networkFlowReportRelativeDateIntervals = [
  "last_3_days",
  "last_7_days",
  "last_14_days",
  "last_30_days",
] as const;

export const networkFlowReportDateIntervals = [...networkFlowReportRelativeDateIntervals, "custom"] as const;

export const networkFlowReportGroupingOptions = [
  "account_id",
  "az_id",
  "dstaddr",
  "dsthostname",
  "flow_direction",
  "interface_id",
  "instance_id",
  "peer_resource_uuid",
  "peer_account_id",
  "peer_vpc_id",
  "peer_region",
  "peer_az_id",
  "peer_subnet_id",
  "peer_interface_id",
  "peer_instance_id",
  "region",
  "resource_uuid",
  "srcaddr",
  "srchostname",
  "subnet_id",
  "traffic_category",
  "traffic_path",
  "vpc_id",
] as const;

export const filterSchema = z.string().min(1).optional().describe("VQL filter using the network_flow_logs namespace.");

export const startDateSchema = dateValidator(
  "Custom range start date, YYYY-MM-DD. Requires date_interval=custom and end_date."
).optional();

export const endDateSchema = dateValidator(
  "Custom range end date, YYYY-MM-DD. Requires date_interval=custom and start_date."
).optional();

export const dateIntervalSchemaForCreate = z
  .enum(networkFlowReportDateIntervals)
  .optional()
  .default("last_7_days")
  .describe("For a custom range, set to custom and provide start_date and end_date.");

export const dateIntervalSchemaForUpdate = z
  .enum(networkFlowReportDateIntervals)
  .optional()
  .describe("For a custom range, set to custom and provide start_date and end_date.");

export const groupingsSchema = z
  .array(z.enum(networkFlowReportGroupingOptions))
  .optional()
  .describe("Dimensions used to group network traffic.");

export const flowDirectionSchema = z
  .enum(["all", "ingress", "egress"])
  .optional()
  .describe("Network traffic direction to include.");

export const flowWeightSchemaForCreate = z
  .enum(["costs", "bytes"])
  .optional()
  .default("costs")
  .describe("Metric used to order aggregated network flow rows.");

export const flowWeightSchemaForUpdate = z
  .enum(["costs", "bytes"])
  .optional()
  .describe("Metric used to order aggregated network flow rows.");

type NetworkFlowReportDateRange = {
  start_date?: string;
  end_date?: string;
  date_interval?: (typeof networkFlowReportDateIntervals)[number];
};

export function validateNetworkFlowReportDateRange(args: NetworkFlowReportDateRange) {
  if (!!args.start_date !== !!args.end_date) {
    throw new MCPUserError({
      errors: [{ message: "start_date and end_date must both be provided together" }],
    });
  }

  if (args.date_interval !== "custom" && (args.start_date !== undefined || args.end_date !== undefined)) {
    throw new MCPUserError({
      errors: [{ message: "start_date and end_date require date_interval to be custom" }],
    });
  }

  if (args.date_interval === "custom" && (args.start_date === undefined || args.end_date === undefined)) {
    throw new MCPUserError({
      errors: [{ message: "custom date_interval requires start_date and end_date" }],
    });
  }

  if (args.start_date !== undefined && args.end_date !== undefined && args.start_date > args.end_date) {
    throw new MCPUserError({
      errors: [{ message: "start_date must be on or before end_date" }],
    });
  }
}

// Output schemas mirror the Vantage client response types.
export const networkFlowReportResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the NetworkFlowReport."),
  default: z.boolean().describe("Indicates whether the NetworkFlowReport is the default report."),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the NetworkFlowReport is a part of."),
  created_by_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token for the User or Team that created this NetworkFlowReport."),
  start_date: z
    .string()
    .nullable()
    .describe("The start date for the NetworkFlowReport. Only set for custom date ranges. ISO 8601 Formatted."),
  end_date: z
    .string()
    .nullable()
    .describe("The end date for the NetworkFlowReport. Only set for custom date ranges. ISO 8601 Formatted."),
  date_interval: z
    .string()
    .nullable()
    .describe("The date range for the NetworkFlowReport. Only present if a custom date range is not specified."),
  groupings: z.string().nullable().describe("The grouping aggregations applied to the filtered data."),
  flow_direction: z
    .string()
    .nullable()
    .describe("The flow weight of the NetworkFlowReport. Possible values: costs, bytes."),
  flow_weight: z.string().describe("The flow weight of the NetworkFlowReport. Possible values: costs, bytes."),
  filter: z
    .string()
    .nullable()
    .describe(
      "The filter applied to the NetworkFlowReport. Additional documentation available at https://docs.vantage.sh/vql."
    ),
});

export const listNetworkFlowReportsResponseSchema = z.object({
  network_flow_reports: z.array(networkFlowReportResponseSchema).describe("Network flow reports."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const networkFlowLogResponseSchema = z.object({
  groupings: z
    .record(z.string(), z.unknown())
    .describe("The grouping values for this aggregated Network Flow Log row."),
  bytes: z.number().describe("The sampling-adjusted estimated byte count."),
  estimated_cost: z.string().describe("The sampling-adjusted estimated cost."),
  currency: z.string().describe("The ISO 4217 currency code for estimated costs."),
  sampled_bytes: z.number().nullable().describe("The observed byte count when sampling applies."),
  sampled_estimated_cost: z.string().nullable().describe("The observed estimated cost when sampling applies."),
});

export const queryNetworkFlowLogsResponseSchema = z.object({
  network_flow_logs: z.array(networkFlowLogResponseSchema).describe("Network flow logs."),
  flow_weight: z.string().describe("Flow weight."),
  sampling: z.record(z.string(), z.unknown()).describe("Sampling."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const networkFlowReportOutputSchema = networkFlowReportResponseSchema.shape;

export const listNetworkFlowReportsOutputSchema = listNetworkFlowReportsResponseSchema.shape;

export const queryNetworkFlowLogsOutputSchema = queryNetworkFlowLogsResponseSchema.shape;
