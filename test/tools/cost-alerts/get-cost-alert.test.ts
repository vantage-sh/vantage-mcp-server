import { type GetCostAlertResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/cost-alerts/get-cost-alert";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

export const success: GetCostAlertResponse = {
  token: "cstm_alrt_rl_123",
  title: "Daily AWS Alert",
  interval: "day",
  threshold: 100,
  unit_type: "currency",
  workspace_token: "wrkspc_123",
  report_tokens: ["rprt_123"],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  email_recipients: ["user@example.com"],
  slack_channels: ["#alerts"],
  teams_channels: ["General"],
  minimum_threshold: 50,
};

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(
  tool,
  [
    {
      name: "takes cost_alert_token",
      data: {
        cost_alert_token: "cstm_alrt_rl_123",
      },
    },
    {
      name: "rejects empty cost_alert_token",
      data: {
        cost_alert_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ cost_alert_token: "cstm_alrt_rl_123" });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_456")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Cost alert not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          cost_alert_token: "cstm_alrt_rl_456",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Cost alert not found" }],
        });
      },
    },
  ]
);
