import {
  createNonEmptyString,
  isNonEmptyString,
  VANTAGE_KUBERNETES_EFFICIENCY_GROUPINGS,
  type VantageKubernetesEfficiencyGrouping,
} from "@vantage-sh/vantage-client";
import z from "zod";
import { pastDateIntervalOptions } from "../../utils/dateIntervalOptions";
import dateValidator from "../../utils/dateValidator";
import { monetaryAmountSchema, paginationSchema } from "../../utils/zod/output";
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

// Output schemas mirror the Vantage client response types.
export const kubernetesEfficiencyReportResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the KubernetesEfficiencyReport."),
  default: z.boolean().describe("Indicates whether the KubernetesEfficiencyReport is the default report."),
  created_at: z.string().describe("The date and time, in UTC, the report was created. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The token for the Workspace the KubernetesEfficiencyReport is a part of."),
  user_token: z
    .string()
    .nullable()
    .optional()
    .describe("The token for the User who created this KubernetesEfficiencyReport."),
  start_date: z
    .string()
    .nullable()
    .describe(
      "The start date for the KubernetesEfficiencyReport. Only set for custom date ranges. ISO 8601 Formatted."
    ),
  end_date: z
    .string()
    .nullable()
    .describe("The end date for the KubernetesEfficiencyReport. Only set for custom date ranges. ISO 8601 Formatted."),
  date_interval: z
    .string()
    .nullable()
    .describe(
      "The date range for the KubernetesEfficiencyReport. Only present if a custom date range is not specified."
    ),
  date_bucket: z
    .string()
    .describe(
      "How costs are grouped and displayed in the KubernetesEfficiencyReport. Possible values: day, week, month."
    ),
  aggregated_by: z
    .string()
    .describe("How costs are aggregated by. Possible values: idle_cost, amount, cost_efficiency."),
  groupings: z
    .string()
    .nullable()
    .describe(
      "Grouping values for aggregating costs on the KubernetesEfficiencyReport. Valid groupings: cluster_id, namespace, region, labeled, category, pod, label:<label_name>."
    ),
  filter: z
    .string()
    .nullable()
    .describe(
      "The filter applied to the KubernetesEfficiencyReport. Additional documentation available at https://docs.vantage.sh/vql."
    ),
});

export const listKubernetesEfficiencyReportsResponseSchema = z.object({
  kubernetes_efficiency_reports: z
    .array(kubernetesEfficiencyReportResponseSchema)
    .describe("Kubernetes efficiency reports."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const kubernetesEfficiencyReportCostLabelResponseSchema = z.object({
  key: z.string().describe("The Kubernetes label key."),
  value: z.string().nullable().describe("The Kubernetes label value. Null when the label key is not present."),
});

export const kubernetesEfficiencyReportCostResponseSchema = z.object({
  accrued_at: z.string().describe("The date bucket for the cost. YYYY-MM-DD formatted."),
  amount: z.string().describe("The total cost amount for the row."),
  idle_cost: z.string().describe("The idle cost amount for the row."),
  cost_efficiency: z
    .string()
    .describe("The cost efficiency ratio for the row, expressed from 0 to 1 under ordinary inputs."),
  currency: z.string().describe("The ISO 4217 currency code for the costs."),
  cluster_id: z.string().nullable().optional().describe("The cluster_id grouping value."),
  namespace: z.string().nullable().optional().describe("The namespace grouping value."),
  region: z.string().nullable().optional().describe("The region grouping value."),
  category: z.string().nullable().optional().describe("The category grouping value."),
  pod: z.string().nullable().optional().describe("The pod grouping value."),
  labeled: z.boolean().optional().describe("Whether the aggregated Kubernetes records contain any labels."),
  labels: z
    .array(kubernetesEfficiencyReportCostLabelResponseSchema)
    .optional()
    .describe("The requested Kubernetes label grouping values."),
});

export const queryKubernetesEfficiencyReportCostsResponseSchema = z.object({
  costs: z.array(kubernetesEfficiencyReportCostResponseSchema).describe("Costs."),
  total_amount: monetaryAmountSchema.describe("Total amount."),
  total_idle_cost: monetaryAmountSchema.describe("Total idle cost."),
  total_cost_efficiency: z.string().describe("Total cost efficiency."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const kubernetesEfficiencyReportOutputSchema = kubernetesEfficiencyReportResponseSchema.shape;

export const listKubernetesEfficiencyReportsOutputSchema = listKubernetesEfficiencyReportsResponseSchema.shape;

export const queryKubernetesEfficiencyReportCostsOutputSchema =
  queryKubernetesEfficiencyReportCostsResponseSchema.shape;
