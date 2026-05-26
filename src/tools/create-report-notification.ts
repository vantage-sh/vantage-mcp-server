import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Create a new Report Notification in Vantage.

Report Notifications send scheduled Cost Report summaries to configured users, Slack channels, or Microsoft Teams channels on a daily, weekly, or monthly cadence. Use this tool when a user asks to create, add, or set up scheduled report delivery for an existing Cost Report.

Do not use this for Cost Alerts, budget alerts, threshold alerts, or spend-limit notifications. Cost Alerts notify users when spend crosses a configured threshold; Report Notifications deliver scheduled report summaries.
`.trim();

export default registerTool({
  name: "create-report-notification",
  title: "Create Report Notification",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("The title of the report notification."),
    cost_report_token: z.string().describe("The token of the Cost Report to send summaries for."),
    workspace_token: z
      .string()
      .optional()
      .describe(
        "The token of the Workspace to add the report notification to. Required if the API token is associated with multiple Workspaces."
      ),
    user_tokens: z.array(z.string()).optional().describe("The tokens of the users that receive the notification."),
    recipient_channels: z
      .array(z.string())
      .optional()
      .describe("The Slack or Microsoft Teams channels that receive the notification."),
    frequency: z.enum(["daily", "weekly", "monthly"]).describe("The frequency the report notification is sent."),
    change: z.enum(["percentage", "dollars"]).describe("The type of change the report notification tracks."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/report_notifications", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
