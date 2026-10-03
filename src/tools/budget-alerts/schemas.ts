import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const budgetAlertBudgetTokens = z.array(vantageToken("budget")).min(1);
export const budgetAlertThreshold = z.number().int().min(0);
export const budgetAlertUserTokens = z.array(vantageToken("user"));
export const budgetAlertRecipientEmails = z.array(z.email());
export const budgetAlertDurationInDays = z
  .string()
  .regex(/^\d*$/, "Must be a whole number of days or an empty string for the full month");
export const budgetAlertPeriodToTrack = z.enum(["start_of_the_month", "end_of_the_month"]);
export const budgetAlertRecipientChannels = z.array(nonempty());

// Output schemas mirror the Vantage client response types.
export const budgetAlertResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  budget_tokens: z
    .array(z.string())
    .describe("The tokens for the Budgets that the Budget Alert is monitoring to trigger alerts on."),
  created_at: z.string().describe("The date and time, in UTC, the Budget Alert was created. ISO 8601 Formatted."),
  workspace_token: z.string().nullable().describe("The token for the Workspace the ResourceReport is a part of."),
  user_token: z.string().nullable().optional().describe("The token for the User who created this BudgetAlert."),
  user_tokens: z
    .array(z.string())
    .describe(
      "The tokens of organization users that receive the alert. Freeform SSO-domain and approved third-party emails are not included; see recipient_emails."
    ),
  recipient_emails: z
    .array(z.string())
    .describe(
      "The email addresses that receive the alert, including organization users, SSO-domain addresses, and approved third-party addresses."
    ),
  duration_in_days: z
    .number()
    .nullable()
    .describe(
      "The number of days from the start or end of the month to trigger the alert if the threshold is reached."
    ),
  threshold: z
    .number()
    .describe(
      "Alerts only send if they reach this number (as a percentage). When threshold is 100, that means alerts are triggered once costs reach 100% of the budget."
    ),
  period_to_track: z
    .string()
    .nullable()
    .describe(
      "The period tracked on the alert. Used with duration_in_days to determine the time window of the alert. Possible values: start_of_the_month, end_of_the_month."
    ),
  integration_provider: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The provider used for sending alerts. This must be configured in the console. Possible values are: slack, microsoft_graph."
    ),
  recipient_channels: z
    .array(z.string())
    .nullable()
    .describe("The channels receiving the alerts. Requires an integration provider to be connected."),
});

export const listBudgetAlertsResponseSchema = z.object({
  budget_alerts: z.array(budgetAlertResponseSchema).describe("Budget alerts."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const budgetAlertOutputSchema = budgetAlertResponseSchema.shape;

export const listBudgetAlertsOutputSchema = listBudgetAlertsResponseSchema.shape;
