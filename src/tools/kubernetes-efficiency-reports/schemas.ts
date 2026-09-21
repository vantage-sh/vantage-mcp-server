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
  .describe(
    "VQL filter using the `kubernetes.` VQL namespace, including fields such as `kubernetes.cluster_id`, `kubernetes.namespace`, and Kubernetes labels."
  );

export const createStartDateSchema = dateValidator(
  "Custom range start date, YYYY-MM-DD. Requires date_interval=custom and end_date."
).optional();

export const createEndDateSchema = dateValidator(
  "Custom range end date, YYYY-MM-DD. Requires date_interval=custom and start_date."
).optional();

export const updateStartDateSchema = dateValidator(
  "Updated custom range start date, YYYY-MM-DD. Omit to preserve the existing start date."
).optional();

export const updateEndDateSchema = dateValidator(
  "Updated custom range end date, YYYY-MM-DD. Omit to preserve the existing end date."
).optional();

const dateIntervalSchema = z.enum(pastDateIntervalOptions);

export const dateIntervalSchemaForCreate = dateIntervalSchema
  .optional()
  .describe(
    "Report date interval. For a custom range, set to custom and provide start_date and end_date. Defaults to this_month when omitted."
  );

export const dateIntervalSchemaForUpdate = dateIntervalSchema
  .optional()
  .describe(
    "Updated report date interval. When changing to custom, also provide start_date and end_date. Omit to preserve the existing interval."
  );

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

function validateDateOrder(args: Pick<DateRange, "start_date" | "end_date">) {
  if (args.start_date !== undefined && args.end_date !== undefined && args.start_date > args.end_date) {
    throw new MCPUserError({
      errors: [{ message: "start_date must be on or before end_date" }],
    });
  }
}

export function validateCreateDateRange(args: DateRange) {
  const hasStartDate = args.start_date !== undefined;
  const hasEndDate = args.end_date !== undefined;

  if (args.date_interval === "custom" && (!hasStartDate || !hasEndDate)) {
    throw new MCPUserError({
      errors: [{ message: "'start_date' and 'end_date' are required for custom date intervals." }],
    });
  }

  if (args.date_interval !== "custom" && (hasStartDate || hasEndDate)) {
    throw new MCPUserError({
      errors: [{ message: "start_date and end_date require date_interval to be custom" }],
    });
  }

  validateDateOrder(args);
}

export function validateUpdateDateRange(args: DateRange) {
  const hasStartDate = args.start_date !== undefined;
  const hasEndDate = args.end_date !== undefined;

  if (args.date_interval === "custom" && (!hasStartDate || !hasEndDate)) {
    throw new MCPUserError({
      errors: [{ message: "'start_date' and 'end_date' are required when changing to a custom date interval." }],
    });
  }

  if (args.date_interval !== undefined && args.date_interval !== "custom" && (hasStartDate || hasEndDate)) {
    throw new MCPUserError({
      errors: [{ message: "start_date and end_date cannot be updated with a non-custom date_interval" }],
    });
  }

  validateDateOrder(args);
}

export function validateQueryDateRange(args: Pick<DateRange, "start_date" | "end_date">) {
  validateDateOrder(args);
}
