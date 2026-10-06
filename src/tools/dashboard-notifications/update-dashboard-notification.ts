import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Updates a Dashboard Notification's title, Dashboard, recipients, or frequency. Omitted fields stay unchanged. Retargeting the Dashboard requires edit access to the new Dashboard.

Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
`.trim();

export default registerTool({
  name: "update-dashboard-notification",
  title: "Update Dashboard Notification",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    dashboard_notification_token: vantageToken("dashboard_notification"),
    title: z.string().min(1).optional().describe("Updated title for the Dashboard Notification."),
    dashboard_token: vantageToken("dashboard").optional(),
    user_tokens: z.array(vantageToken("user")).optional().describe("Updated users that receive the notification."),
    recipient_emails: z
      .array(z.email())
      .optional()
      .describe(
        "Updated email addresses that receive the notification. Each address must be an organization user, on the account's SSO domain, or an approved third-party service address."
      ),
    frequency: z
      .enum(["daily", "weekly", "monthly"])
      .optional()
      .describe("Updated frequency for the Dashboard Notification."),
  },
  async execute(args, ctx) {
    const { dashboard_notification_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/dashboard_notifications/${pathEncode(dashboard_notification_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
