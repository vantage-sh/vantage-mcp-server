import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const anomalyAlertResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  created_at: z.string().describe("The date and time, in UTC, the AnomalyAlert was created. ISO 8601 Formatted."),
  alerted_at: z
    .string()
    .nullable()
    .optional()
    .describe("The date and time, in UTC, the AnomalyAlert is sent. ISO 8601 Formatted."),
  category: z.string().nullable().describe("The category of the AnomalyAlert."),
  service: z.string().describe("The provider service causing the AnomalyAlert."),
  provider: z.string().describe("The provider of the service causing the AnomalyAlert."),
  amount: z.string().describe("The amount observed."),
  previous_amount: z.string().describe("The previous amount observed."),
  seven_day_average: z.string().describe("The seven day average of the amount observed."),
  status: z.string().describe("The status of the AnomalyAlert."),
  feedback: z.string().nullable().optional().describe("The user-provided feedback of why alert was ignored/archived."),
  resources: z.array(z.string()).describe("The names of the resources the AnomalyAlert was attributed to."),
  resource_tokens: z.array(z.string()).describe("The tokens of the Resources the AnomalyAlert was attributed to."),
  cost_report_token: z.string().describe("The token of the Report associated with the AnomalyAlert."),
});

export const listAnomaliesResponseSchema = z.object({
  anomaly_alerts: z.array(anomalyAlertResponseSchema).describe("Anomaly alerts."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const anomalyAlertOutputSchema = anomalyAlertResponseSchema.shape;

export const listAnomaliesOutputSchema = listAnomaliesResponseSchema.shape;
