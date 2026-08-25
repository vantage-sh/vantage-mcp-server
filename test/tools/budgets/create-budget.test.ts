import type { CreateBudgetResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budgets/create-budget";
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

const undefineds = {
  workspace_token: undefined,
  cost_report_token: undefined,
  child_budget_tokens: undefined,
  period_cadence: undefined,
  periods: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  name: "Test Budget",
  workspace_token: "wrkspc_123",
  cost_report_token: "rprt_456",
  child_budget_tokens: ["bdgt_123", "bdgt_456"],
  period_cadence: {
    starts_at: "2024-01-01",
    interval_count: 1,
    interval_unit: "month",
  },
  periods: [
    {
      start_at: "2024-01-01",
      end_at: "2024-01-31",
      amount: 1000,
    },
    {
      start_at: "2024-02-01",
      end_at: "2024-02-29",
      amount: 1200,
    },
  ],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...undefineds,
      name: "Minimal Budget",
    },
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "empty name",
    data: {
      ...validInputArguments,
      name: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "budget with workspace token only",
    data: {
      ...undefineds,
      name: "Workspace Budget",
      workspace_token: "wrkspc_789",
    },
  },
  {
    name: "budget with cost report token only",
    data: {
      ...undefineds,
      name: "Cost Report Budget",
      cost_report_token: "rprt_789",
    },
  },
  {
    name: "hierarchical budget with child tokens",
    data: {
      ...undefineds,
      name: "Parent Budget",
      child_budget_tokens: ["bdgt_111", "bdgt_222"],
    },
  },
  {
    name: "budget with single period",
    data: {
      ...undefineds,
      name: "Single Period Budget",
      periods: [
        {
          start_at: "2024-01-01",
          amount: 5000,
        },
      ],
    },
  },
  {
    name: "budget with period without end date",
    data: {
      ...undefineds,
      name: "Open-ended Budget",
      periods: [
        {
          start_at: "2024-01-01",
          amount: 2500,
        },
      ],
    },
  },
  {
    name: "period with zero amount",
    data: {
      ...undefineds,
      name: "Zero Budget",
      periods: [
        {
          start_at: "2024-01-01",
          amount: 0,
        },
      ],
    },
  },
  {
    name: "period with negative amount",
    data: {
      ...undefineds,
      name: "Invalid Budget",
      periods: [
        {
          start_at: "2024-01-01",
          amount: -100,
        },
      ],
    },
    expectedIssues: ["Too small: expected number to be >=0"],
  },
  {
    name: "empty child budget tokens array",
    data: {
      ...undefineds,
      name: "Empty Children Budget",
      child_budget_tokens: [],
    },
  },
  {
    name: "empty periods array",
    data: {
      ...undefineds,
      name: "Empty Periods Budget",
      periods: [],
    },
  },
  {
    name: "handles invalid date in periods start_at",
    data: {
      ...validInputArguments,
      periods: [
        {
          ...validInputArguments.periods![0],
          start_at: "invalid-date",
        },
      ],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "handles invalid date in periods end_at",
    data: {
      ...validInputArguments,
      periods: [
        {
          ...validInputArguments.periods![0],
          end_at: "invalid-date",
        },
      ],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "budget with weekly period_cadence",
    data: {
      ...undefineds,
      name: "Weekly Budget",
      period_cadence: {
        starts_at: "2026-01-01",
        interval_count: 2,
        interval_unit: "week",
      },
      periods: [
        {
          start_at: "2026-01-01",
          amount: 500,
        },
      ],
    },
  },
  {
    name: "period_cadence with null starts_at",
    data: {
      ...undefineds,
      name: "Cleared Anchor Budget",
      period_cadence: {
        starts_at: null,
        interval_count: 1,
        interval_unit: "month",
      },
    },
  },
  {
    name: "period_cadence with invalid interval_unit",
    data: {
      ...undefineds,
      name: "Invalid Cadence Budget",
      period_cadence: {
        starts_at: "2026-01-01",
        interval_count: 1,
        interval_unit: "fortnight" as "month",
      },
    },
    expectedIssues: ['Invalid option: expected one of "day"|"week"|"month"|"year"'],
  },
  {
    name: "period_cadence with zero interval_count",
    data: {
      ...undefineds,
      name: "Invalid Count Budget",
      period_cadence: {
        starts_at: "2026-01-01",
        interval_count: 0,
        interval_unit: "month",
      },
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "period_cadence with invalid starts_at",
    data: {
      ...undefineds,
      name: "Invalid Anchor Budget",
      period_cadence: {
        starts_at: "invalid-date",
        interval_count: 1,
        interval_unit: "month",
      },
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
];

const successData: CreateBudgetResponse = {
  token: "bdgt_123",
  name: "Test Budget",
  workspace_token: "wrkspc_123",
  cost_report_token: "rprt_456",
  budget_alert_tokens: [],
  child_budget_tokens: [],
  created_at: "2023-01-01T00:00:00Z",
  period_cadence: {
    starts_at: "2024-01-01",
    interval_count: 1,
    interval_unit: "month",
  },
  periods: [
    {
      start_at: "2024-01-01",
      end_at: "2024-01-31",
      amount: "1000.0",
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budgets",
        params: validInputArguments,
        method: "POST",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validInputArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/budgets",
        params: {
          name: "Budget with Invalid Report",
          cost_report_token: "rprt_nonexistent",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Cost report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        name: "Budget with Invalid Report",
        cost_report_token: "rprt_nonexistent",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
