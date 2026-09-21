import {
  createNonEmptyString,
  isNonEmptyString,
  VANTAGE_KUBERNETES_EFFICIENCY_GROUPINGS,
  type VantageKubernetesEfficiencyGrouping,
} from "@vantage-sh/vantage-client";
import z from "zod";
import { pastDateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";
import MCPUserError from "../structure/MCPUserError";

export const groupingDescription =
  "Kubernetes dimensions to group by. Use label:<label_name> to group by a Kubernetes label.";

const groupingValueSchema = z.union(
  [
    z.enum(VANTAGE_KUBERNETES_EFFICIENCY_GROUPINGS),
    z
      .string()
      .startsWith("label:", { error: groupingDescription })
      .refine((value) => isNonEmptyString(value.slice(6)), { error: groupingDescription })
      .transform((value): VantageKubernetesEfficiencyGrouping => `label:${createNonEmptyString(value.slice(6))}`),
  ],
  { error: groupingDescription }
);

export const groupingsSchema = z
  .array(groupingValueSchema)
  .min(1)
  .max(100)
  .refine((values) => new Set(values).size === values.length, {
    error: "groupings must contain unique values",
  })
  .optional()
  .describe(groupingDescription);

export const filterSchema = z
  .string()
  .min(1)
  .optional()
  .describe("VQL filter using the kubernetes namespace. See the VQL documentation for Kubernetes Efficiency Reports.");

export const startDateSchema = dateValidator(
  "Custom range start date, YYYY-MM-DD. Provide end_date and omit date_interval."
).optional();

export const endDateSchema = dateValidator(
  "Custom range end date, YYYY-MM-DD. Provide start_date and omit date_interval."
).optional();

export const dateIntervalSchema = z
  .enum(pastDateIntervalOptions)
  .optional()
  .describe("Relative date interval. Incompatible with start_date and end_date; defaults to this_month when omitted.");

export const aggregatedBySchema = z
  .enum(["idle_cost", "amount", "cost_efficiency"])
  .optional()
  .describe("Metric used to aggregate and order Kubernetes efficiency costs.");

export const dateBucketSchema = z
  .enum(["day", "week", "month", "quarter"])
  .optional()
  .describe("Time bucket for Kubernetes efficiency costs.");

type DateRange = {
  start_date?: string;
  end_date?: string;
  date_interval?: (typeof pastDateIntervalOptions)[number];
};

export function validateDateRange(args: DateRange) {
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
}
