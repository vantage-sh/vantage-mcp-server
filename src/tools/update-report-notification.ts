import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Updates an existing Report Notification in Vantage.

Use this tool to change a scheduled Cost Report notification's title, Cost Report, recipients, Slack or Microsoft Teams channels, delivery frequency, or tracked change type. Report Notifications deliver recurring Cost Report summaries on a daily, weekly, or monthly cadence.

Do not use this for Cost Alerts, budget alerts, threshold alerts, or spend-limit notifications. Cost Alerts manage spend thresholds; Report Notifications manage scheduled report delivery.
`.trim();

export default registerTool({
  name: "update-report-notification",
  title: "Update Report Notification",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    report_notification_token: z.string().describe("The token of the report notification to update."),
    title: z.string().min(1).optional().describe("Updated title for the report notification."),
    cost_report_token: z.string().optional().describe("Updated Cost Report token."),
    user_tokens: z.array(z.string()).optional().describe("Updated user tokens that receive the notification."),
    recipient_channels: z
      .array(z.string())
      .optional()
      .describe("Updated Slack or Microsoft Teams channels that receive the notification."),
    frequency: z
      .enum(["daily", "weekly", "monthly"])
      .optional()
      .describe("Updated frequency for the report notification."),
    change: z
      .enum(["percentage", "dollars"])
      .optional()
      .describe("Updated type of change the report notification tracks."),
  },
  async execute(args, ctx) {
    const { report_notification_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/report_notifications/${pathEncode(report_notification_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
