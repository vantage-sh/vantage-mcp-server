import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Creates a scheduled email of a Dashboard. Delivery is daily, weekly, or monthly to organization users, SSO-domain addresses, or approved third-party emails.

Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
`.trim();

export default registerTool({
  name: "create-dashboard-notification",
  title: "Create Dashboard Notification",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("The title of the Dashboard Notification."),
    dashboard_token: vantageToken("dashboard"),
    workspace_token: vantageToken("workspace", {
      description: "Required if the API token is associated with multiple Workspaces.",
    }).optional(),
    user_tokens: z.array(vantageToken("user")).optional().describe("Users that receive the notification."),
    recipient_emails: z
      .array(z.email())
      .optional()
      .describe(
        "Email addresses that receive the notification. Each address must be an organization user, on the account's SSO domain, or an approved third-party service address."
      ),
    frequency: z.enum(["daily", "weekly", "monthly"]).describe("How often the Dashboard Notification is sent."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/dashboard_notifications", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
