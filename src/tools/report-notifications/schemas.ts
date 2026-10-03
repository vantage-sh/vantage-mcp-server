import z from "zod";
import { paginationSchema } from "../../utils/zod/output";

// Output schemas mirror the Vantage client response types.
export const reportNotificationResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the ReportNotification."),
  cost_report_token: z.string().describe("The token for a CostReport the ReportNotification is applied to."),
  user_tokens: z
    .array(z.string())
    .describe(
      "The tokens of organization users that receive the notification. Freeform SSO-domain and approved third-party emails are not included; see recipient_emails."
    ),
  recipient_emails: z
    .array(z.string())
    .describe(
      "The email addresses that receive the notification, including organization users, SSO-domain addresses, and approved third-party addresses."
    ),
  recipient_channels: z
    .array(z.string())
    .describe("The Slack or Microsoft Teams channels that receive the notification."),
  frequency: z.enum(["daily", "weekly", "monthly"]).describe("The frequency the ReportNotification is sent."),
  change: z.enum(["percentage", "dollars"]).describe("The type of change the ReportNotification is tracking."),
});

export const listReportNotificationsResponseSchema = z.object({
  report_notifications: z.array(reportNotificationResponseSchema).describe("Report notifications."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const reportNotificationOutputSchema = reportNotificationResponseSchema.shape;

export const listReportNotificationsOutputSchema = listReportNotificationsResponseSchema.shape;
