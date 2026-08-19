import { pathEncode, type UpdateBudgetAlertResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budget-alerts/update-budget-alert";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  budget_alert_token: "bdgt_alrt_123",
  budget_tokens: ["bdgt_456"],
  threshold: 90,
  user_tokens: [],
  recipient_emails: ["finops@example.com"],
  duration_in_days: "5",
  period_to_track: "end_of_the_month",
  recipient_channels: ["FinOps"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "token only",
    data: {
      budget_alert_token: "bdgt_alrt_123",
      budget_tokens: undefined,
      threshold: undefined,
      user_tokens: undefined,
      recipient_emails: undefined,
      duration_in_days: undefined,
      period_to_track: undefined,
      recipient_channels: undefined,
    },
  },
  { name: "all valid updates", data: validArguments },
  {
    name: "rejects an empty Budget list",
    data: { ...validArguments, budget_tokens: [] },
    expectedIssues: ["Too small: expected array to have >=1 items"],
  },
  {
    name: "rejects a negative threshold",
    data: { ...validArguments, threshold: -1 },
    expectedIssues: ["Too small: expected number to be >=0"],
  },
  {
    name: "rejects non-numeric duration",
    data: { ...validArguments, duration_in_days: "five" },
    expectedIssues: ["Must be a whole number of days or an empty string for the full month"],
  },
  {
    name: "rejects an invalid recipient email",
    data: { ...validArguments, recipient_emails: ["not-an-email"] },
    expectedIssues: ["Invalid email address"],
  },
];

const successData: UpdateBudgetAlertResponse = {
  token: "bdgt_alrt_123",
  budget_tokens: ["bdgt_456"],
  created_at: "2024-03-19T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: "usr_123",
  user_tokens: [],
  recipient_emails: ["finops@example.com"],
  duration_in_days: 5,
  threshold: 90,
  period_to_track: "end_of_the_month",
  integration_provider: "microsoft_graph",
  recipient_channels: ["FinOps"],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_123")}`,
        params: {
          budget_tokens: ["bdgt_456"],
          threshold: 90,
          user_tokens: [],
          recipient_emails: ["finops@example.com"],
          duration_in_days: "5",
          period_to_track: "end_of_the_month",
          recipient_channels: ["FinOps"],
        },
        method: "PUT",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/budget_alerts/${pathEncode("bdgt_alrt_123")}`,
        params: {
          budget_tokens: ["bdgt_456"],
          threshold: 90,
          user_tokens: [],
          recipient_emails: ["finops@example.com"],
          duration_in_days: "5",
          period_to_track: "end_of_the_month",
          recipient_channels: ["FinOps"],
        },
        method: "PUT",
        result: { ok: false, errors: [{ message: "Budget alert not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Budget alert not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
