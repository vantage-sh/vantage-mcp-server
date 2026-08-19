import { pathEncode, type UpdateBudgetAlertRequest } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
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
Update an existing Budget Alert's monitored Budgets, percentage threshold, monthly time window, or recipients. Budget Alerts monitor Budget objects.
`.trim();

export default registerTool({
  name: "update-budget-alert",
  title: "Update Budget Alert",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    budget_alert_token: vantageToken("budget_alert"),
    budget_tokens: budgetAlertBudgetTokens.optional().describe("Updated Budgets monitored by this Budget Alert."),
    threshold: budgetAlertThreshold
      .optional()
      .describe("Updated Budget percentage that triggers the alert; 100 means the Budget has been fully reached."),
    user_tokens: budgetAlertUserTokens.optional().describe("Updated users that receive the Budget Alert."),
    recipient_emails: budgetAlertRecipientEmails
      .optional()
      .describe(
        "Updated email addresses that receive the Budget Alert. Each address must belong to an organization user or a verified domain."
      ),
    duration_in_days: budgetAlertDurationInDays
      .optional()
      .describe("Updated number of days in the monthly time window; use an empty string for the full month."),
    period_to_track: budgetAlertPeriodToTrack
      .optional()
      .describe("Updated side of the month from which duration_in_days is measured."),
    recipient_channels: budgetAlertRecipientChannels
      .optional()
      .describe("Updated connected Slack or Microsoft Teams channels that receive the Budget Alert."),
  },
  async execute(args, ctx) {
    const { budget_alert_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/budget_alerts/${pathEncode(budget_alert_token)}`,
      body as UpdateBudgetAlertRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
