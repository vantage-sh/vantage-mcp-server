import type { CreateBudgetAlertRequest } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  budgetAlertBudgetTokens,
  budgetAlertDurationInDays,
  budgetAlertPeriodToTrack,
  budgetAlertRecipientChannels,
  budgetAlertRecipientEmails,
  budgetAlertThreshold,
  budgetAlertUserTokens,
} from "./schemas";

const description = `
Create a Budget Alert that notifies users or connected channels when one or more Budgets reach a percentage threshold during a monthly time window.
`.trim();

export default registerTool({
  name: "create-budget-alert",
  title: "Create Budget Alert",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    budget_tokens: budgetAlertBudgetTokens.describe("Budgets monitored by this Budget Alert."),
    threshold: budgetAlertThreshold.describe(
      "Budget percentage that triggers the alert; 100 means costs have reached 100% of the Budget."
    ),
    user_tokens: budgetAlertUserTokens.optional().describe("Users that receive the Budget Alert."),
    recipient_emails: budgetAlertRecipientEmails
      .optional()
      .describe(
        "Email addresses that receive the Budget Alert. Each address must belong to an organization user or a verified domain."
      ),
    duration_in_days: budgetAlertDurationInDays.describe(
      "Number of days from the start or end of the month in which the threshold triggers the alert; use an empty string for the full month."
    ),
    period_to_track: budgetAlertPeriodToTrack
      .optional()
      .describe("Side of the month from which duration_in_days is measured; defaults to start_of_the_month."),
    recipient_channels: budgetAlertRecipientChannels
      .optional()
      .describe("Connected Slack or Microsoft Teams channels that receive the Budget Alert."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/budget_alerts", args as CreateBudgetAlertRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
