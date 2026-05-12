import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Create a new Cost Alert in Vantage. Cost Alerts are threshold-based spending alerts for one or more Cost Reports.

Use this tool when a user asks to create, add, or set up a cost alert, spending alert, budget alert, threshold alert, or spend-limit notification.

Do not use this for Report Notifications, scheduled report summaries, or recurring Cost Report delivery.
`.trim();

export default registerTool({
  name: "create-cost-alert",
  title: "Create Cost Alert",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).max(255).describe("The title of the cost alert."),
    interval: z.enum(["day", "week", "month", "quarter"]).describe("The interval for the cost alert."),
    threshold: z.number().gt(0).describe("The threshold amount that triggers the alert. Must be greater than 0."),
    unit_type: z.enum(["currency", "percentage"]).describe("The unit type for the threshold."),
    workspace_token: z.string().describe("The token of the Workspace to add the cost alert to."),
    report_tokens: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe("The tokens of the cost reports to monitor. Between 1 and 10 report tokens."),
    email_recipients: z.array(z.string()).optional().describe("Email addresses to notify when the alert triggers."),
    slack_channels: z.array(z.string()).optional().describe("Slack channels to notify when the alert triggers."),
    teams_channels: z
      .array(z.string())
      .optional()
      .describe("Microsoft Teams channels to notify when the alert triggers."),
    minimum_threshold: z
      .number()
      .min(0)
      .optional()
      .describe("Minimum threshold amount. Only applicable for percentage unit_type."),
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi("/v2/cost_alerts", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
