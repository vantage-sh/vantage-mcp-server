import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import dateValidator from "../utils/dateValidator";

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

export const filterSchema = z
  .string()
  .min(1)
  .optional()
  .describe("VQL filter for the Network Flow Report. Filters use the network_flow_logs namespace.");

export const startDateSchema = dateValidator(
  "Start date for a custom report range, formatted YYYY-MM-DD. Provide end_date with it."
).optional();

export const endDateSchema = dateValidator(
  "End date for a custom report range, formatted YYYY-MM-DD. Provide start_date with it."
).optional();

export const dateIntervalSchema = z
  .enum(networkFlowReportDateIntervals)
  .optional()
  .describe("Report date interval. Defaults to last_7_days; use custom with start_date and end_date.");

export const groupingsSchema = z
  .array(z.enum(networkFlowReportGroupingOptions))
  .optional()
  .describe(`Dimensions used to group network traffic. Valid values: ${networkFlowReportGroupingOptions.join(", ")}.`);

export const flowDirectionSchema = z
  .enum(["all", "ingress", "egress"])
  .optional()
  .describe("Network traffic direction to include: all, ingress, or egress.");

export const flowWeightSchema = z
  .enum(["costs", "bytes"])
  .optional()
  .describe("Metric used to weight network flows. Defaults to costs.");

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
}
