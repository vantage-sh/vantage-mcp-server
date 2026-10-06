import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Updates a Dashboard Notification. Omitted fields stay unchanged. Setting dashboard_token points the email at that Dashboard and requires edit access to it. Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
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
    title: z.string().min(1).optional().describe("New name for this notification."),
    dashboard_token: vantageToken("dashboard").optional(),
    user_tokens: z
      .array(vantageToken("user"))
      .optional()
      .describe("Vantage users who receive the email. Use get-users to find tokens."),
    recipient_emails: z
      .array(z.email())
      .optional()
      .describe(
        "Email addresses that receive the Dashboard. Each address must be an organization user, on the account SSO domain, or an approved external address."
      ),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional().describe("How often the email is sent."),
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
