import { type GetAnomalyAlertResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/anomalies/get-anomaly";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const success: GetAnomalyAlertResponse = {
  token: "anmly_alrt_123",
  created_at: "2023-01-01T00:00:00Z",
  category: "compute",
  service: "AmazonEC2",
  provider: "aws",
  amount: "100.5",
  previous_amount: "25.0",
  seven_day_average: "10.0",
  status: "active",
  resources: ["resource_123", "resource_456"],
  resource_tokens: ["resource_123", "resource_456"],
  cost_report_token: "rprt_123",
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
      name: "takes anomaly_alert_token",
      data: {
        anomaly_alert_token: "anmly_alrt_123",
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_123")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ anomaly_alert_token: "anmly_alrt_123" });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_456")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Anomaly alert not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          anomaly_alert_token: "anmly_alrt_456",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Anomaly alert not found" }],
        });
      },
    },
  ]
);
