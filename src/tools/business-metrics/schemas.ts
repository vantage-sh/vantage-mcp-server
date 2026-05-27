import z from "zod";
import dateValidator from "../utils/dateValidator";

export const BUSINESS_METRICS_LIMIT = 1000;

export const businessMetricValueArgs = {
  business_metric_token: z.string().describe("The BusinessMetric token to retrieve values for."),
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1."),
  start_date: dateValidator(
    "Query BusinessMetric values by the first date to filter from. Must be YYYY-MM-DD format."
  ).optional(),
};
