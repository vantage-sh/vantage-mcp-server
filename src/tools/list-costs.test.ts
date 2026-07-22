import type { GetCostsResponse } from "@vantage-sh/vantage-client";
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

// Non-settings fields expected in every /v2/costs request.
const baseApiParams = {
  page: 1,
  cost_report_token: "crt_123",
  start_date: "2023-01-01",
  end_date: "2023-01-31",
  date_bin: "month" as const,
  groupings: DEFAULT_GROUPINGS,
  limit: DEFAULT_LIMIT,
};

const validArguments: InferValidators<Validators> = {
  page: 1,
  cost_report_token: "crt_123",
  filter: undefined,
  workspace_token: undefined,
  order: undefined,
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
    name: "successful call with month date_bin omits settings so API uses report defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: baseApiParams,
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
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          date_bin: "day",
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
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          date_bin: "week",
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
    name: "user-provided settings are sent to the API",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          "settings[amortize]": false,
          "settings[include_credits]": true,
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
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/costs",
        params: {
          ...baseApiParams,
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
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
