import type { GetBusinessMetricValuesResponse } from "@vantage-sh/vantage-client";
import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/business-metrics/get-business-metric-values";
import { BUSINESS_METRIC_DATA_LIMIT } from "../../../src/tools/business-metrics/schemas";
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
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  business_metric_token: "bsnss_mtrc_3080a050c04104ff",
  date_bin: "day",
  label_values: ["Prod", "Staging"],
  page: 1,
  start_date: "2024-01-01",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page and start date",
    data: {
      business_metric_token: "bsnss_mtrc_3080a050c04104ff",
      date_bin: undefined,
      label_values: undefined,
      page: undefined,
      start_date: undefined,
    },
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
  {
    name: "invalid date bin",
    data: {
      ...validArguments,
      date_bin: "week" as any,
    },
    expectedIssues: ['Invalid option: expected one of "raw"|"day"|"month"'],
  },
  poisonOneValue<Validators, string>(validArguments, "start_date", dateValidatorPoisoner),
];

const successData: GetBusinessMetricValuesResponse = {
  values: [
    { date: "2024-01-03T00:00:00Z", amount: "300.0", label: "Prod" },
    { date: "2024-01-02T00:00:00Z", amount: "200.0" },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_3080a050c04104ff")}/values`,
        params: {
          date_bin: "day",
          label_values: ["Prod", "Staging"],
          page: 1,
          start_date: "2024-01-01",
          limit: BUSINESS_METRIC_DATA_LIMIT,
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
        values: successData.values,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "encodes token in path",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_with/slash")}/values`,
        params: {
          date_bin: "month",
          label_values: undefined,
          page: 1,
          start_date: undefined,
          limit: BUSINESS_METRIC_DATA_LIMIT,
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
        business_metric_token: "bsnss_mtrc_with/slash",
        date_bin: undefined,
        label_values: undefined,
        page: 1,
        start_date: undefined,
      });
      expect(res).toEqual({
        values: successData.values,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "preserves raw timestamps",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_3080a050c04104ff")}/values`,
        params: {
          label_values: undefined,
          page: 1,
          start_date: undefined,
          limit: BUSINESS_METRIC_DATA_LIMIT,
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
        business_metric_token: "bsnss_mtrc_3080a050c04104ff",
        date_bin: "raw",
        label_values: undefined,
        page: 1,
        start_date: undefined,
      });
      expect(res).toEqual({
        values: successData.values,
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
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_nonexistent")}/values`,
        params: {
          date_bin: "day",
          label_values: ["Prod", "Staging"],
          page: 1,
          start_date: "2024-01-01",
          limit: BUSINESS_METRIC_DATA_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Business Metric not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...validArguments,
        business_metric_token: "bsnss_mtrc_nonexistent",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Business Metric not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
