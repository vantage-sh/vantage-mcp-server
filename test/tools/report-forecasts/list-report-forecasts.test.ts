import type { GetReportForecastsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-forecasts/list-report-forecasts";
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

const COST_REPORT_TOKEN = "rprt_fd7190753bb1ce4a";

const validArguments: InferValidators<Validators> = {
  cost_report_token: COST_REPORT_TOKEN,
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      cost_report_token: COST_REPORT_TOKEN,
      page: undefined,
    },
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
  {
    name: "empty cost_report_token",
    data: {
      cost_report_token: "",
      page: 1,
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData: GetReportForecastsResponse = {
  report_forecasts: [
    {
      token: "rprt_frcst_b6fc93cfbe7bb782",
      title: "Board Plan",
      cost_report_token: COST_REPORT_TOKEN,
      scenario_model_tokens: ["frcst_mdl_998be85cff4d0574"],
      business_metric_token: null,
      is_default: false,
      created_by_token: "usr_9be7c063f1529dff",
      created_at: "2026-07-28T15:37:51Z",
      updated_at: "2026-07-28T15:37:51Z",
    },
  ],
  links: {
    self: `https://api.vantage.sh/v2/report_forecasts?cost_report_token=${COST_REPORT_TOKEN}&page=1`,
    first: `https://api.vantage.sh/v2/report_forecasts?cost_report_token=${COST_REPORT_TOKEN}&page=1`,
    next: `https://api.vantage.sh/v2/report_forecasts?cost_report_token=${COST_REPORT_TOKEN}&page=2`,
    last: `https://api.vantage.sh/v2/report_forecasts?cost_report_token=${COST_REPORT_TOKEN}&page=2`,
    prev: null,
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_forecasts",
        params: {
          cost_report_token: COST_REPORT_TOKEN,
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
        report_forecasts: successData.report_forecasts,
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_forecasts",
        params: {
          cost_report_token: COST_REPORT_TOKEN,
          page: 1,
          limit: DEFAULT_LIMIT,
        },
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
