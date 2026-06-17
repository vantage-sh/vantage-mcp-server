import { pathEncode, type UpdateCostAlertRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  costAlertInterval,
  costAlertMinimumThreshold,
  costAlertReportTokens,
  costAlertThreshold,
  costAlertTitle,
  costAlertUnitType,
} from "./schemas";

const description = `
Updates an existing Cost Alert. Use to change the title, threshold, interval, monitored Cost Reports, or notification destinations.

Use list-cost-alerts or get-cost-alert to find the cost_alert_token. Do not use this for Report Notifications or recurring Cost Report delivery.
`.trim();

export default registerTool({
  name: "update-cost-alert",
  title: "Update Cost Alert",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    cost_alert_token: z.string().min(1).describe("The token of the Cost Alert to update."),
    title: costAlertTitle.optional().describe("Updated title for the Cost Alert."),
    email_recipients: z
      .array(z.string())
      .optional()
      .describe("Updated email addresses to notify when the alert triggers."),
    interval: costAlertInterval.optional().describe("Updated evaluation interval for the Cost Alert."),
    threshold: costAlertThreshold.optional().describe("Updated threshold amount that triggers the alert."),
    slack_channels: z
      .array(z.string())
      .optional()
      .describe("Updated Slack channels to notify when the alert triggers."),
    teams_channels: z
      .array(z.string())
      .optional()
      .describe("Updated Microsoft Teams channels to notify when the alert triggers."),
    unit_type: costAlertUnitType.optional().describe("Updated unit type for the threshold."),
    report_tokens: costAlertReportTokens.optional().describe("Updated Cost Report tokens to monitor."),
    minimum_threshold: costAlertMinimumThreshold
      .optional()
      .describe("Updated minimum threshold amount. Only applicable for percentage unit_type."),
  },
  async execute(args, ctx) {
    const { cost_alert_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/cost_alerts/${pathEncode(cost_alert_token)}`,
      body as UpdateCostAlertRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
