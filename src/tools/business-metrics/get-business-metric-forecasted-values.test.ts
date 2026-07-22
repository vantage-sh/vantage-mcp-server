import type { GetBusinessMetricForecastedValuesResponse } from "@vantage-sh/vantage-client";
import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
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
} from "../utils/testing";
import tool from "./get-business-metric-forecasted-values";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  business_metric_token: "bsnss_mtrc_3080a050c04104ff",
  page: 1,
  start_date: "2025-01-01",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page and start date",
    data: {
      business_metric_token: "bsnss_mtrc_3080a050c04104ff",
      page: undefined,
      start_date: undefined,
    },
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
  poisonOneValue<Validators, string>(validArguments, "start_date", dateValidatorPoisoner),
];

const successData: GetBusinessMetricForecastedValuesResponse = {
  values: [
    { date: "2025-01-03T00:00:00Z", amount: "300.0", label: "Prod" },
    { date: "2025-01-02T00:00:00Z", amount: "200.0" },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_3080a050c04104ff")}/forecasted_values`,
        params: {
          page: 1,
          start_date: "2025-01-01",
          limit: 5000,
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
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_with/slash")}/forecasted_values`,
        params: {
          page: 1,
          start_date: undefined,
          limit: 5000,
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
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_nonexistent")}/forecasted_values`,
        params: {
          page: 1,
          start_date: "2025-01-01",
          limit: 5000,
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
