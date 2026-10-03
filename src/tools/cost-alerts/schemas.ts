import z from "zod";
import { vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const costAlertIntervals = ["day", "week", "month", "quarter"] as const;
export const costAlertUnitTypes = ["currency", "percentage"] as const;

export const costAlertTitle = z.string().min(1).max(255);
export const costAlertInterval = z.enum(costAlertIntervals);
export const costAlertThreshold = z.number().gt(0);
export const costAlertUnitType = z.enum(costAlertUnitTypes);
export const costAlertReportTokens = z.array(vantageToken("cost_report")).min(1).max(10);
export const costAlertMinimumThreshold = z.number().min(0);

// Output schemas mirror the Vantage client response types.
export const costAlertResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("Title."),
  email_recipients: z.array(z.string()).describe("The email addresses that will receive the alert."),
  slack_channels: z
    .array(z.string())
    .describe(
      "The Slack channels that will receive the alert. Make sure your slack integration is connected at https://console.vantage.sh/settings/slack."
    ),
  teams_channels: z
    .array(z.string())
    .describe(
      "The Microsoft Teams channels that will receive the alert. Make sure your teams integration is connected at https://console.vantage.sh/settings/microsoft_teams."
    ),
  created_at: z.string().describe("The date and time, in UTC, for when the alert was created. ISO 8601 Formatted."),
  updated_at: z
    .string()
    .describe("The date and time, in UTC, for when the alert was last updated. ISO 8601 Formatted."),
  workspace_token: z.string().describe("The ID of the organization that owns the CostAlert."),
  interval: z
    .string()
    .describe("The period of time used to compare costs. Options are 'day', 'week', 'month', 'quarter'."),
  threshold: z.number().describe("The cost change threshold to alert on."),
  unit_type: z.string().describe("The unit type used to compare costs. Options are 'currency' or 'percentage'."),
  minimum_threshold: z
    .number()
    .nullable()
    .describe(
      "The minimum monetary amount threshold for percentage-based alerts. When set, alerts will only trigger if the cost change meets this minimum, even if the percentage threshold is exceeded."
    ),
  report_tokens: z.array(z.string()).describe("The tokens of the reports to alert on."),
});

export const costAlertEventResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  created_at: z.string().describe("The date and time, in UTC, the CostAlertEvent was created. ISO 8601 Formatted."),
  triggered_at: z.string().describe("The date and time, in UTC, the CostAlertEvent is sent. ISO 8601 Formatted."),
  description: z.string().describe("The description of the CostAlertEvent."),
  alert_type: z.string().describe("The type of the CostAlertEvent."),
  metadata: z.record(z.string(), z.unknown()).describe("The metadata of the CostAlertEvent."),
  report_token: z.string().describe("The token of the report associated with the CostAlertEvent."),
  alert_token: z.string().describe("The token of the alert associated with the CostAlertEvent."),
});

export const listCostAlertEventsResponseSchema = z.object({
  cost_alert_events: z.array(costAlertEventResponseSchema).describe("Cost alert events."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const listCostAlertsResponseSchema = z.object({
  cost_alerts: z.array(costAlertResponseSchema).describe("Cost alerts."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const costAlertOutputSchema = costAlertResponseSchema.shape;

export const costAlertEventOutputSchema = costAlertEventResponseSchema.shape;

export const listCostAlertEventsOutputSchema = listCostAlertEventsResponseSchema.shape;

export const listCostAlertsOutputSchema = listCostAlertsResponseSchema.shape;
