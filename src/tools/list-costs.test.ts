import type { GetCostReportResponse, GetCostsResponse } from "@vantage-sh/vantage-client";
import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-costs";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const DEFAULT_GROUPINGS = "provider,service,account_id" as unknown as string[];

const REPORT_SETTINGS = {
  include_credits: false,
  include_refunds: false,
  include_discounts: true,
  include_tax: true,
  amortize: true,
  unallocated: false,
  aggregate_by: "cost" as const,
  show_previous_period: true,
};

const REPORT_SETTINGS_AS_API_PARAMS = {
  "settings[aggregate_by]": "cost",
  "settings[amortize]": true,
  "settings[include_credits]": false,
  "settings[include_discounts]": true,
  "settings[include_refunds]": false,
  "settings[include_tax]": true,
  "settings[show_previous_period]": true,
  "settings[unallocated]": false,
};

const reportData: GetCostReportResponse = {
  token: "crt_123",
  title: "Test Report",
  settings: REPORT_SETTINGS,
  groupings: "service,provider",
  created_at: "2024-07-03T00:00:00Z",
  workspace_token: "wrkspc_123",
  start_date: "2023-01-01",
  end_date: "2023-01-31",
  date_interval: "custom",
  chart_type: "line",
  date_bin: "cumulative",
  business_metric_tokens_with_metadata: [],
  default_forecast: { kind: "baseline" },
  filter: null,
  chart_settings: {
    y_axis_dimension: "cost",
    x_axis_dimension: ["date"],
  },
};

const getReportCall = (token: string) => ({
  endpoint: `/v2/cost_reports/${pathEncode(token)}` as const,
  params: {},
  method: "GET" as const,
  result: {
    ok: true as const,
    data: reportData,
  },
});

const validArguments: InferValidators<Validators> = {
  page: 1,
  cost_report_token: "crt_123",
  start_date: "2023-01-01",
  end_date: "2023-01-31",
  date_bin: "month",
  settings_include_credits: undefined,
  settings_include_refunds: undefined,
  settings_include_discounts: undefined,
  settings_include_tax: undefined,
  settings_amortize: undefined,
  settings_unallocated: undefined,
  settings_aggregate_by: undefined,
  settings_show_previous_period: undefined,
  groupings: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...validArguments,
      page: 1,
      cost_report_token: "crt_123",
      start_date: undefined,
      end_date: undefined,
      date_bin: undefined,
    },
  },
  {
    name: "all valid arguments",
    data: validArguments,
  },
  {
    name: "date_bin day",
    data: {
      ...validArguments,
      date_bin: "day",
    },
  },
  {
    name: "date_bin week",
    data: {
      ...validArguments,
      date_bin: "week",
    },
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetCostsResponse = {
  costs: [
    {
      tag: "cost_123",
      amount: "100.5",
      service: "AmazonEC2",
      accrued_at: "2023-01-01",
      currency: "USD",
    },
    {
      tag: "cost_456",
      amount: "75.25",
      service: "AmazonS3",
      accrued_at: "2023-01-01",
      currency: "USD",
    },
  ],
  total_cost: {
    amount: "175.75",
    currency: "USD",
  },
  total_usage: {},
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with month date_bin uses report settings as defaults",
    apiCallHandler: requestsInOrder([
      getReportCall("crt_123"),
      {
        endpoint: "/v2/costs",
        params: {
          ...REPORT_SETTINGS_AS_API_PARAMS,
          cost_report_token: "crt_123",
          start_date: "2023-01-01",
          end_date: "2023-01-31",
          date_bin: "month",
          groupings: DEFAULT_GROUPINGS,
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        costs: successData.costs,
        total_cost: successData.total_cost,
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
    name: "successful call with day date_bin",
    apiCallHandler: requestsInOrder([
      getReportCall("crt_123"),
      {
        endpoint: "/v2/costs",
        params: {
          ...validArguments,
          ...REPORT_SETTINGS_AS_API_PARAMS,
          groupings: DEFAULT_GROUPINGS,
          date_bin: "day",
          limit: DEFAULT_LIMIT,
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
        ...validArguments,
        date_bin: "day",
      });
      expect(res.notes).toBe("Costs records represent one day.");
    },
  },
  {
    name: "successful call with week date_bin",
    apiCallHandler: requestsInOrder([
      getReportCall("crt_123"),
      {
        endpoint: "/v2/costs",
        params: {
          ...validArguments,
          ...REPORT_SETTINGS_AS_API_PARAMS,
          groupings: DEFAULT_GROUPINGS,
          date_bin: "week",
          limit: DEFAULT_LIMIT,
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
        ...validArguments,
        date_bin: "week",
      });
      expect(res.notes).toBe(
        "Costs records represent one week, the accrued_at field is the first day of the week. If your date range is less than one week, this record includes only data for that date range, not the full week."
      );
    },
  },
  {
    name: "user-provided settings override report settings",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_reports/${pathEncode("crt_123")}` as const,
        params: {},
        method: "GET" as const,
        result: {
          ok: true as const,
          data: {
            ...reportData,
            settings: {
              ...REPORT_SETTINGS,
              amortize: true,
              include_credits: false,
            },
          },
        },
      },
      {
        endpoint: "/v2/costs",
        params: {
          ...REPORT_SETTINGS_AS_API_PARAMS,
          "settings[amortize]": false,
          "settings[include_credits]": true,
          cost_report_token: "crt_123",
          start_date: "2023-01-01",
          end_date: "2023-01-31",
          date_bin: "month",
          groupings: DEFAULT_GROUPINGS,
          page: 1,
          limit: DEFAULT_LIMIT,
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
        ...validArguments,
        settings_amortize: false,
        settings_include_credits: true,
      });
      expect(res.costs).toEqual(successData.costs);
    },
  },
  {
    name: "report with amortize=false uses report default",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_reports/${pathEncode("crt_456")}` as const,
        params: {},
        method: "GET" as const,
        result: {
          ok: true as const,
          data: {
            ...reportData,
            token: "crt_456",
            settings: {
              ...REPORT_SETTINGS,
              amortize: false,
            },
          },
        },
      },
      {
        endpoint: "/v2/costs",
        params: {
          ...REPORT_SETTINGS_AS_API_PARAMS,
          "settings[amortize]": false,
          cost_report_token: "crt_456",
          start_date: "2023-01-01",
          end_date: "2023-01-31",
          date_bin: "month",
          groupings: DEFAULT_GROUPINGS,
          page: 1,
          limit: DEFAULT_LIMIT,
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
        ...validArguments,
        cost_report_token: "crt_456",
      });
      expect(res.costs).toEqual(successData.costs);
    },
  },
  {
    name: "unsuccessful cost report fetch",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_reports/${pathEncode("crt_123")}` as const,
        params: {},
        method: "GET" as const,
        result: {
          ok: false as const,
          errors: [{ message: "Cost report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...validArguments,
        page: 1,
        cost_report_token: "crt_123",
        start_date: undefined,
        end_date: undefined,
        date_bin: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost report not found" }],
      });
    },
  },
  {
    name: "unsuccessful costs call",
    apiCallHandler: requestsInOrder([
      getReportCall("crt_123"),
      {
        endpoint: "/v2/costs",
        params: {
          cost_report_token: "crt_123",
          page: 1,
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
          limit: DEFAULT_LIMIT,
          groupings: DEFAULT_GROUPINGS,
          ...REPORT_SETTINGS_AS_API_PARAMS,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Invalid cost report token" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...validArguments,
        page: 1,
        cost_report_token: "crt_123",
        start_date: undefined,
        end_date: undefined,
        date_bin: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Invalid cost report token" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
