import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/cost-alerts/delete-cost-alert";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = { token: "cstm_alrt_rl_123" };

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
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          cost_alert_token: "cstm_alrt_rl_123",
        });
        expect(res).toEqual({ token: "cstm_alrt_rl_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_missing")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Cost alert not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          cost_alert_token: "cstm_alrt_rl_missing",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Cost alert not found" }],
        });
      },
    },
  ]
);
