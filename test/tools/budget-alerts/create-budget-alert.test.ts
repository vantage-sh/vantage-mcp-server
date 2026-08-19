import type { CreateBudgetAlertResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budget-alerts/create-budget-alert";
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
  budget_tokens: ["bdgt_123", "bdgt_456"],
  threshold: 75,
  user_tokens: ["usr_123"],
  recipient_emails: ["finops@example.com"],
  duration_in_days: "7",
  period_to_track: "start_of_the_month",
  recipient_channels: ["#finops"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal full-month alert",
    data: {
      budget_tokens: ["bdgt_123"],
      threshold: 100,
      duration_in_days: "",
      user_tokens: undefined,
      recipient_emails: undefined,
      period_to_track: undefined,
      recipient_channels: undefined,
    },
  },
  { name: "all valid arguments", data: validArguments },
  {
    name: "requires at least one Budget",
    data: { ...validArguments, budget_tokens: [] },
    expectedIssues: ["Too small: expected array to have >=1 items"],
  },
  {
    name: "threshold must be a whole percentage",
    data: { ...validArguments, threshold: 75.5 },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
  {
    name: "duration must be whole days",
    data: { ...validArguments, duration_in_days: "7.5" },
    expectedIssues: ["Must be a whole number of days or an empty string for the full month"],
  },
  {
    name: "period must be a supported month boundary",
    data: { ...validArguments, period_to_track: "middle_of_the_month" as never },
    expectedIssues: ['Invalid option: expected one of "start_of_the_month"|"end_of_the_month"'],
  },
  {
    name: "validates user tokens",
    data: { ...validArguments, user_tokens: ["team_123"] },
    expectedIssues: ["Must be a User token (usr_*)"],
  },
  {
    name: "validates recipient emails",
    data: { ...validArguments, recipient_emails: ["not-an-email"] },
    expectedIssues: ["Invalid email address"],
  },
];

const successData: CreateBudgetAlertResponse = {
  token: "bdgt_alrt_123",
  budget_tokens: validArguments.budget_tokens,
  created_at: "2024-03-19T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: "usr_123",
  user_tokens: validArguments.user_tokens ?? [],
  recipient_emails: validArguments.recipient_emails ?? [],
  duration_in_days: 7,
  threshold: validArguments.threshold,
  period_to_track: validArguments.period_to_track ?? null,
  integration_provider: "slack",
  recipient_channels: validArguments.recipient_channels ?? null,
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budget_alerts",
        params: validArguments,
        method: "POST",
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
        endpoint: "/v2/budget_alerts",
        params: validArguments,
        method: "POST",
        result: { ok: false, errors: [{ message: "Budget not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Budget not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
