import { type GetBudgetAlertResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budget-alerts/get-budget-alert";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const success: GetBudgetAlertResponse = {
  token: "bdgt_alrt_123",
  budget_tokens: ["bdgt_123"],
  created_at: "2024-03-19T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: "usr_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finops@example.com"],
  duration_in_days: null,
  threshold: 100,
  period_to_track: null,
  integration_provider: null,
  recipient_channels: null,
};

testTool(
  tool,
  [
    { name: "takes budget_alert_token", data: { budget_alert_token: "bdgt_alrt_123" } },
    {
      name: "rejects a non-Budget Alert token",
      data: { budget_alert_token: "bdgt_123" },
      expectedIssues: ["Must be a Budget Alert token (bdgt_alrt_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_123")}`,
          params: {},
          method: "GET",
          result: { ok: true, data: success },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess({ budget_alert_token: "bdgt_alrt_123" })).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_missing")}`,
          params: {},
          method: "GET",
          result: { ok: false, errors: [{ message: "Budget alert not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({ budget_alert_token: "bdgt_alrt_missing" });
        expect(error.exception).toEqual({ errors: [{ message: "Budget alert not found" }] });
      },
    },
  ]
);
