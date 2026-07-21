import z from "zod";
import dateValidator from "../utils/dateValidator";

export const BUSINESS_METRICS_LIMIT = 1000;
export const BUSINESS_METRIC_LABELS_LIMIT = 5000;

export const businessMetricValueArgs = {
  business_metric_token: z.string().describe("The BusinessMetric token to retrieve values for."),
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
  start_date: dateValidator(
    "Query BusinessMetric values by the first date to filter from. Must be YYYY-MM-DD format."
  ).optional(),
};

export const historicalBusinessMetricValueArgs = {
  ...businessMetricValueArgs,
  label_values: z
    .array(z.string())
    .optional()
    .describe(
      "Return values matching any exact label value. For multi-label metrics, matches values under any label key. If exact values are not confirmed, call list-business-metric-labels first."
    ),
};
