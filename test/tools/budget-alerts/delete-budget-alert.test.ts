import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budget-alerts/delete-budget-alert";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = {
  token: "bdgt_alrt_123",
};

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
    { name: "takes budget_alert_token", data: { budget_alert_token: "bdgt_alrt_123" } },
    {
      name: "rejects a non-Budget Alert token",
      data: { budget_alert_token: "bdgt_123" },
      expectedIssues: ["Must be a Budget Alert token (bdgt_alrt_*)"],
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess({ budget_alert_token: "bdgt_alrt_123" })).toEqual({
          token: "bdgt_alrt_123",
        });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_missing")}`,
          params: {},
          method: "DELETE",
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
