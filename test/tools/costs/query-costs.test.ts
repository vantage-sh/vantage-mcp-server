import type { GetCostsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/costs/query-costs";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

// groupings is pre-joined to a CSV string for /v2/costs (coerce_with: CSV::parse_line)
const GROUPINGS_API = "provider,service,region" as unknown as string[];

// Non-settings fields expected in every /v2/costs request via query-costs.
const baseApiParams = {
  page: 1,
  filter: "(costs.provider = 'aws')",
  workspace_token: "wrkspc_123",
  start_date: "2023-01-01",
  end_date: "2023-01-31",
  date_bin: "month" as const,
  groupings: GROUPINGS_API,
  limit: 100,
};

const validInputArguments = {
  page: 1,
  filter: "(costs.provider = 'aws')",
  start_date: "2023-01-01",
  end_date: "2023-01-31",
  workspace_token: "wrkspc_123",
  date_bin: "month",
  sort_column: undefined,
  sort_direction: undefined,
  settings_include_credits: undefined,
  settings_include_refunds: undefined,
  settings_include_discounts: undefined,
  settings_include_tax: undefined,
  settings_amortize: undefined,
  settings_unallocated: undefined,
  settings_aggregate_by: undefined,
  settings_show_previous_period: undefined,
  groupings: ["provider", "service", "region"] as string[],
} as const;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      page: 1,
      filter: "(costs.provider = 'aws')",
      start_date: undefined,
      end_date: undefined,
      workspace_token: "wrkspc_123",
      date_bin: undefined,
      sort_column: undefined,
      sort_direction: undefined,
      settings_include_credits: undefined,
      settings_include_refunds: undefined,
      settings_include_discounts: undefined,
      settings_include_tax: undefined,
      settings_amortize: undefined,
      settings_unallocated: undefined,
      settings_aggregate_by: undefined,
      settings_show_previous_period: undefined,
      groupings: ["provider", "service", "region"],
    },
  },
  {
    name: "blank workspace_token",
    data: {
      ...validInputArguments,
      workspace_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "aggregate by usage",
    data: {
      ...validInputArguments,
      settings_aggregate_by: "usage",
    },
  },
  {
    name: "aggregate by count",
    data: {
      ...validInputArguments,
      settings_aggregate_by: "count",
    },
  },
  {
    name: "date_bin day",
    data: {
      ...validInputArguments,
      date_bin: "day",
    },
  },
  {
    name: "date_bin week",
    data: {
      ...validInputArguments,
      date_bin: "week",
    },
  },
  {
    name: "blank sort column",
    data: { ...validInputArguments, sort_column: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "invalid sort direction",
    data: { ...validInputArguments, sort_direction: "descending" as "asc" },
    expectedIssues: ['Invalid option: expected one of "asc"|"desc"'],
  },
  poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetCostsResponse = {
  costs: [
    {
      accrued_at: "2023-01-01",
      currency: "USD",
      tag: "cost_123",
      amount: "100.5",
      service: "AmazonEC2",
      provider: "aws",
    },
    {
      accrued_at: "2023-01-01",
      currency: "USD",
      tag: "cost_456",
      amount: "75.25",
      service: "AmazonS3",
      provider: "aws",
    },
  ],
  total_cost: {
    amount: "175.75",
    currency: "USD",
  },
  total_usage: {},
  links: {},
};

const displayedCosts = successData.costs.map(({ currency: _currency, ...row }) => row);

const countSuccessData: GetCostsResponse = {
  ...successData,
  total_count: 42,
  counts: [
    { accrued_at: "2023-01-01", count: 20 },
    { accrued_at: "2023-02-01", count: 22 },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  ...(["amount", "usage_amount"] as const).flatMap((sort_column) =>
    (["asc", "desc", undefined] as const).map((sort_direction): ExecutionTestTableItem<Validators, OutputSchema> => {
      const sortParams = { sort_column, ...(sort_direction ? { sort_direction } : {}) };
      const usageSettings = sort_column === "usage_amount" ? { settings_aggregate_by: "usage" as const } : {};
      return {
        name: `forwards ${sort_column} sorting with direction ${sort_direction ?? "omitted"}`,
        apiCallHandler: requestsInOrder([
          {
            endpoint: "/v2/costs",
            params: {
              ...baseApiParams,
              ...sortParams,
              ...(sort_column === "usage_amount" ? { "settings[aggregate_by]": "usage" } : {}),
            },
            method: "GET",
            result: { ok: true, data: successData },
          },
        ]),
        handler: async ({ callExpectingSuccess }) => {
          const result = await callExpectingSuccess({ ...validInputArguments, ...sortParams, ...usageSettings });
          expect(result.costs).toEqual(displayedCosts);
          expect(result.total_cost).toEqual(successData.total_cost);
        },
      };
    })
  ),
  {
    name: "rejects sort_direction without sort_column before calling the API",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({ ...validInputArguments, sort_direction: "desc" });
      expect(error.exception).toEqual({
        errors: [{ message: "sort_direction requires sort_column" }],
      });
    },
  },
  {
    name: "rejects amount sort when aggregate_by is count",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...validInputArguments,
        sort_column: "amount",
        sort_direction: "desc",
        settings_aggregate_by: "count",
      });
      expect(error.exception).toEqual({
        errors: [
          {
            message: "sort_column amount and usage_amount are not supported when settings_aggregate_by is count.",
          },
        ],
      });
    },
  },
  {
    name: "rejects usage_amount unless aggregate_by is usage",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...validInputArguments,
        sort_column: "usage_amount",
        sort_direction: "desc",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "sort_column usage_amount requires settings_aggregate_by=usage." }],
      });
    },
  },
  {
    name: "ranks groupings by period cost and explains the order",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          sort_column: "amount",
          sort_direction: "desc",
          "settings[show_previous_period]": true,
        },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        sort_column: "amount",
        sort_direction: "desc",
        settings_show_previous_period: true,
      });
      expect(result.costs).toEqual(displayedCosts);
      expect(result.notes).toContain("each grouping's total cost");
      expect(result.notes).toContain("highest total first");
      expect(result.notes).toContain("Later pages continue this ranking");
    },
  },
  {
    name: "ranks groupings by period usage when aggregate_by is usage",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          sort_column: "usage_amount",
          sort_direction: "desc",
          "settings[aggregate_by]": "usage",
        },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        sort_column: "usage_amount",
        sort_direction: "desc",
        settings_aggregate_by: "usage",
      });
      expect(result.notes).toContain("each grouping's total usage");
      expect(result.notes).toContain("highest total first");
    },
  },
  {
    name: "warns when an amount sort is ascending",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, sort_column: "amount" },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        sort_column: "amount",
      });
      expect(result.notes).toContain("lowest total first");
      expect(result.notes).toContain("sort_direction=desc");
    },
  },
  ...(["asc", "desc", undefined] as const).map((sort_direction): ExecutionTestTableItem<Validators, OutputSchema> => {
    const sortParams = { sort_column: "service", ...(sort_direction ? { sort_direction } : {}) };
    return {
      name: `forwards grouping sorting with direction ${sort_direction ?? "omitted"}`,
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/costs",
          params: { ...baseApiParams, ...sortParams },
          method: "GET",
          result: { ok: true, data: successData },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({ ...validInputArguments, ...sortParams });
        expect(result.costs).toEqual(displayedCosts);
      },
    };
  }),
  {
    name: "successful call omits settings so API uses workspace defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
          limit: 50,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        page: 1,
        filter: "(costs.provider = 'aws')",
        start_date: undefined,
        end_date: undefined,
        workspace_token: "wrkspc_123",
        date_bin: undefined,
        sort_column: undefined,
        sort_direction: undefined,
        settings_include_credits: undefined,
        settings_include_refunds: undefined,
        settings_include_discounts: undefined,
        settings_include_tax: undefined,
        settings_amortize: undefined,
        settings_unallocated: undefined,
        settings_aggregate_by: undefined,
        settings_show_previous_period: undefined,
        groupings: ["provider", "service", "region"],
      });
      expect(res).toEqual({
        costs: displayedCosts,
        total_cost: successData.total_cost,
        notes: "Costs records represent one day.",
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with all arguments and explicit settings",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          "settings[include_credits]": false,
          "settings[include_refunds]": false,
          "settings[include_discounts]": true,
          "settings[include_tax]": true,
          "settings[amortize]": true,
          "settings[unallocated]": false,
          "settings[aggregate_by]": "cost",
          "settings[show_previous_period]": true,
        },
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            links: {
              next: "https://example.com?page=2",
            },
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...validInputArguments,
        settings_include_credits: false,
        settings_include_refunds: false,
        settings_include_discounts: true,
        settings_include_tax: true,
        settings_amortize: true,
        settings_unallocated: false,
        settings_aggregate_by: "cost",
        settings_show_previous_period: true,
      });
      expect(res).toEqual({
        costs: displayedCosts,
        total_cost: successData.total_cost,
        notes:
          "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.",
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "successful call with day date_bin",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          date_bin: "day",
          limit: 50,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...validInputArguments,
        date_bin: "day",
      });
      expect(res).toEqual({
        costs: displayedCosts,
        total_cost: successData.total_cost,
        notes: "Costs records represent one day.",
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with empty costs returns hint",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          filter: "(costs.provider = 'aws' AND costs.service = 'AmazonVPC')",
          start_date: "2025-04-01",
          end_date: "2025-05-31",
        },
        method: "GET",
        result: {
          ok: true,
          data: {
            costs: [],
            total_cost: { amount: "0", currency: "USD" },
            total_usage: {},
            links: {},
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...validInputArguments,
        filter: "(costs.provider = 'aws' AND costs.service = 'AmazonVPC')",
        start_date: "2025-04-01",
        end_date: "2025-05-31",
      });
      expect(res.costs).toEqual([]);
      expect(res.hint).toContain("No cost rows matched");
    },
  },
  {
    name: "aggregate by count returns total_count and counts",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          "settings[aggregate_by]": "count",
        },
        method: "GET",
        result: {
          ok: true,
          data: countSuccessData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...validInputArguments,
        settings_aggregate_by: "count",
      });
      expect(res).toEqual({
        costs: displayedCosts,
        total_cost: countSuccessData.total_cost,
        total_count: 42,
        counts: countSuccessData.counts,
        notes:
          "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.",
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
          limit: 50,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Invalid VQL query" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        page: 1,
        filter: "(costs.provider = 'aws')",
        start_date: undefined,
        end_date: undefined,
        workspace_token: "wrkspc_123",
        date_bin: undefined,
        sort_column: undefined,
        sort_direction: undefined,
        settings_include_credits: undefined,
        settings_include_refunds: undefined,
        settings_include_discounts: undefined,
        settings_include_tax: undefined,
        settings_amortize: undefined,
        settings_unallocated: undefined,
        settings_aggregate_by: undefined,
        settings_show_previous_period: undefined,
        groupings: ["provider", "service", "region"],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Invalid VQL query" }],
      });
    },
  },
  {
    name: "caps resource_id groupings at 50 even when date_bin is month",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, groupings: "resource_id", limit: 50 },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      await callExpectingSuccess({ ...validInputArguments, groupings: ["resource_id"] });
    },
  },
  {
    name: "caps tag groupings at 50 even when date_bin is month",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, groupings: "service,tag:environment", limit: 50 },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      await callExpectingSuccess({ ...validInputArguments, groupings: ["service", "tag:environment"] });
    },
  },
  {
    name: "keeps a week bin without resource or tag groupings at 100",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, date_bin: "week", limit: 100 },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      await callExpectingSuccess({ ...validInputArguments, date_bin: "week" });
    },
  },
  {
    name: "truncates a page over the character budget and hides the next page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: baseApiParams,
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            costs: Array.from({ length: 40 }, (_, index) => ({
              accrued_at: "2023-01-01",
              currency: "USD",
              amount: "1.00",
              provider: "aws",
              service: `AmazonEC2-${index}`,
              resource_id: `${"i".padEnd(1500, "a")}-${index}`,
            })),
            links: { next: "https://example.com?page=2" },
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validInputArguments);
      const costs = result.costs as Array<{ resource_id?: string; currency?: string }>;
      expect(result.truncated).toBe(true);
      expect(costs.length).toBeGreaterThan(0);
      expect(costs.length).toBeLessThan(40);
      expect(result.rows_returned).toBe(costs.length);
      expect(result.rows_omitted).toBe(40 - costs.length);
      expect(JSON.stringify(result).length).toBeLessThanOrEqual(40_000);
      expect(result.total_cost).toEqual(successData.total_cost);
      expect(result.pagination).toEqual({ hasNextPage: false, nextPage: 0 });
      expect(result.notes).toContain("Narrow the filter, drop resource_id, or raise date_bin.");
      expect(result.notes).not.toContain("next page");
      expect(costs[0]?.currency).toBeUndefined();
      expect(costs[0]?.resource_id).toBe(`${"i".padEnd(1500, "a")}-0`);
      expect(costs[costs.length - 1]?.resource_id).toBe(`${"i".padEnd(1500, "a")}-${costs.length - 1}`);
    },
  },
  {
    name: "collapses amount sorting to one row per grouping and sums usage",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, sort_column: "amount", sort_direction: "desc" },
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            costs: [
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "10.00",
                provider: "aws",
                service: "AmazonEC2",
                usage: { amount: "2.5", unit: "Hrs" },
              },
              {
                accrued_at: "2023-01-02",
                currency: "USD",
                amount: "5.50",
                provider: "aws",
                service: "AmazonEC2",
                usage: { amount: "1.5", unit: "Hrs" },
              },
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "2.00",
                provider: "aws",
                service: "AmazonS3",
                usage: { amount: "4", unit: "GB" },
              },
              {
                accrued_at: "2023-01-02",
                currency: "USD",
                amount: "3.25",
                provider: "aws",
                service: "AmazonS3",
                usage: { amount: "1", unit: "GB" },
              },
            ],
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        sort_column: "amount",
        sort_direction: "desc",
      });
      expect(result.costs).toEqual([
        {
          amount: "15.50",
          provider: "aws",
          service: "AmazonEC2",
          usage: { amount: "4.0", unit: "Hrs" },
        },
        {
          amount: "5.25",
          provider: "aws",
          service: "AmazonS3",
          usage: { amount: "5", unit: "GB" },
        },
      ]);
      expect(result.truncated).toBeUndefined();
      expect(result.notes).toContain("sum of the date bins on this page");
    },
  },
  {
    name: "keeps daily rows when an amount sort filters to one resource_id",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          filter: "(costs.provider = 'aws' AND costs.resource_id = 'i-abc')",
          date_bin: "day",
          limit: 50,
          sort_column: "amount",
          sort_direction: "desc",
        },
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            costs: [
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "10.00",
                provider: "aws",
                resource_id: "i-abc",
              },
              {
                accrued_at: "2023-01-02",
                currency: "USD",
                amount: "4.00",
                provider: "aws",
                resource_id: "i-abc",
              },
            ],
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        filter: "(costs.provider = 'aws' AND costs.resource_id = 'i-abc')",
        date_bin: "day",
        sort_column: "amount",
        sort_direction: "desc",
      });
      expect(result.costs).toEqual([
        { accrued_at: "2023-01-01", amount: "10.00", provider: "aws", resource_id: "i-abc" },
        { accrued_at: "2023-01-02", amount: "4.00", provider: "aws", resource_id: "i-abc" },
      ]);
    },
  },
  {
    name: "omits row currency and a usage_unit that repeats usage.unit",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: { ...baseApiParams, "settings[aggregate_by]": "usage" },
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            costs: [
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "1.00",
                provider: "aws",
                usage_unit: "GB",
                usage: { amount: "8", unit: "GB" },
              },
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "2.00",
                provider: "aws",
                usage_unit: "Hrs",
                usage: { amount: "3", unit: "GB" },
              },
            ],
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validInputArguments,
        settings_aggregate_by: "usage",
      });
      expect(result.costs).toEqual([
        {
          accrued_at: "2023-01-01",
          amount: "1.00",
          provider: "aws",
          usage: { amount: "8", unit: "GB" },
        },
        {
          accrued_at: "2023-01-01",
          amount: "2.00",
          provider: "aws",
          usage_unit: "Hrs",
          usage: { amount: "3", unit: "GB" },
        },
      ]);
    },
  },
  {
    name: "keeps row currency when total_cost has no currency",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: baseApiParams,
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            total_cost: { amount: "100.5" },
            costs: [
              {
                accrued_at: "2023-01-01",
                currency: "USD",
                amount: "100.5",
                provider: "aws",
                service: "AmazonEC2",
              },
            ],
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validInputArguments);
      expect(result.costs).toEqual([
        {
          accrued_at: "2023-01-01",
          currency: "USD",
          amount: "100.5",
          provider: "aws",
          service: "AmazonEC2",
        },
      ]);
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
