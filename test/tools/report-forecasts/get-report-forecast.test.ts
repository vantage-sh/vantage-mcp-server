import { type GetReportForecastResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-forecasts/get-report-forecast";
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

const TOKEN = "rprt_frcst_b6fc93cfbe7bb782";
const ENCODED_TOKEN = "rprt_frcst_a/b";

const validArguments: InferValidators<Validators> = {
  report_forecast_token: TOKEN,
};

const successData: GetReportForecastResponse = {
  token: TOKEN,
  title: "Board Plan",
  cost_report_token: "rprt_fd7190753bb1ce4a",
  scenario_model_tokens: ["frcst_mdl_998be85cff4d0574"],
  business_metric_token: null,
  is_default: false,
  created_by_token: "usr_9be7c063f1529dff",
  created_at: "2026-07-28T15:37:51Z",
  updated_at: "2026-07-28T15:37:51Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "valid token",
    data: validArguments,
  },
  {
    name: "empty token",
    data: {
      report_forecast_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "encodes token in path",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(ENCODED_TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: { ...successData, token: ENCODED_TOKEN },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({ report_forecast_token: ENCODED_TOKEN });
      expect(res).toEqual({ ...successData, token: ENCODED_TOKEN });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Scenario models are not enabled for this account." }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Scenario models are not enabled for this account." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
