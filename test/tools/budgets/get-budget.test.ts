import { type GetBudgetResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budgets/get-budget";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const success: GetBudgetResponse = {
  token: "bdgt_123",
  name: "Monthly AWS Budget",
  type: "cost",
  workspace_token: "wrkspc_123",
  created_at: "2023-01-15T10:30:00Z",
  budget_alert_tokens: [],
  child_budget_tokens: [],
  period_cadence: {
    starts_at: null,
    interval_count: 1,
    interval_unit: "month",
  },
  periods: [],
  cost_report_token: "rprt_123",
};

const successWithPerformance = {
  ...success,
  type: "usage",
  unit: "GB",
  periods: [{ start_at: "2026-09-01", end_at: "2026-09-30", amount: "100.50" }],
  performance: [{ date: "2026-09-30", actual: "95.00", amount: "100.50", type: "usage", unit: "GB" }],
} satisfies GetBudgetResponse;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes budget_token",
    data: {
      budget_token: "bdgt_123",
      include_performance: undefined,
    },
  },
  {
    name: "with include_performance",
    data: {
      budget_token: "bdgt_123",
      include_performance: true,
    },
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call without include_performance",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/budgets/${pathEncode("bdgt_123")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: success,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        budget_token: "bdgt_123",
        include_performance: undefined,
      });
      expect(res).toEqual(success);
    },
  },
  {
    name: "successful call with include_performance",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/budgets/${pathEncode("bdgt_123")}`,
        params: { include_performance: true },
        method: "GET",
        result: {
          ok: true,
          data: successWithPerformance,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        budget_token: "bdgt_123",
        include_performance: true,
      });
      expect(res).toEqual(successWithPerformance);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/budgets/${pathEncode("bdgt_notfound")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Budget not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        budget_token: "bdgt_notfound",
        include_performance: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Budget not found" }],
      });
    },
  },
];

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  { name: "usage Budget with periods and performance", data: successWithPerformance },
  {
    name: "rejects a numeric performance amount that would lose decimal precision",
    data: {
      ...successWithPerformance,
      performance: [{ ...successWithPerformance.performance[0], amount: 100.5 as any }],
    },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
