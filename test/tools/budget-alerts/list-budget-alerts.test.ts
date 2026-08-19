import type { GetBudgetAlertsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budget-alerts/list-budget-alerts";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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

const noArguments: InferValidators<Validators> = {
  page: undefined,
  limit: undefined,
  workspace_token: undefined,
  budget_token: undefined,
};

const validArguments: InferValidators<Validators> = {
  page: 2,
  limit: 1000,
  workspace_token: "wrkspc_123",
  budget_token: "bdgt_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "no filters", data: noArguments },
  { name: "workspace and budget filters", data: validArguments },
  {
    name: "limit above API maximum",
    data: { ...validArguments, limit: 1001 },
    expectedIssues: ["Too big: expected number to be <=1000"],
  },
  {
    name: "invalid budget token",
    data: { ...validArguments, budget_token: "rprt_123" },
    expectedIssues: ["Must be a Budget token (bdgt_*)"],
  },
];

const budgetAlert = {
  token: "bdgt_alrt_123",
  budget_tokens: ["bdgt_123"],
  created_at: "2024-03-19T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: "usr_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finops@example.com"],
  duration_in_days: 7,
  threshold: 75,
  period_to_track: "start_of_the_month",
  integration_provider: "slack",
  recipient_channels: ["#finops"],
};

const successData: GetBudgetAlertsResponse = {
  budget_alerts: [budgetAlert],
  links: { next: "https://api.vantage.sh/v2/budget_alerts?page=3" },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budget_alerts",
        params: validArguments,
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual({
        budget_alerts: [budgetAlert],
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "successful call with defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budget_alerts",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          workspace_token: undefined,
          budget_token: undefined,
        },
        method: "GET",
        result: { ok: true, data: { budget_alerts: [], links: {} } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(noArguments);
      expect(result).toEqual({
        budget_alerts: [],
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budget_alerts",
        params: validArguments,
        method: "GET",
        result: { ok: false, errors: [{ message: "Access denied" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Access denied" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
