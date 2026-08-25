import { pathEncode, type UpdateReportForecastResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-forecasts/update-report-forecast";
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

const undefineds = {
  title: undefined,
  scenario_model_tokens: undefined,
  business_metric_token: undefined,
  set_as_default: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  report_forecast_token: TOKEN,
  title: "Updated Board Plan",
  scenario_model_tokens: ["frcst_mdl_998be85cff4d0574", "frcst_mdl_47f8f6511171bc8f"],
  business_metric_token: null,
  set_as_default: true,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "title only",
    data: {
      ...undefineds,
      report_forecast_token: TOKEN,
      title: "Updated Title",
    },
  },
  {
    name: "all valid arguments including clear",
    data: validInputArguments,
  },
  {
    name: "empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "set_as_default only",
    data: {
      ...undefineds,
      report_forecast_token: TOKEN,
      set_as_default: false,
    },
  },
];

const successData: UpdateReportForecastResponse = {
  token: TOKEN,
  title: "Updated Board Plan",
  cost_report_token: "rprt_fd7190753bb1ce4a",
  scenario_model_tokens: ["frcst_mdl_998be85cff4d0574", "frcst_mdl_47f8f6511171bc8f"],
  business_metric_token: null,
  is_default: true,
  created_by_token: "usr_9be7c063f1529dff",
  created_at: "2026-07-28T15:37:51Z",
  updated_at: "2026-07-28T16:00:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful clear and replace",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
        params: {
          title: "Updated Board Plan",
          scenario_model_tokens: ["frcst_mdl_998be85cff4d0574", "frcst_mdl_47f8f6511171bc8f"],
          business_metric_token: null,
          set_as_default: true,
        },
        method: "PUT",
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
    name: "encodes token in path",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(ENCODED_TOKEN)}`,
        params: {
          title: "Encoded",
        },
        method: "PUT",
        result: {
          ok: true,
          data: { ...successData, token: ENCODED_TOKEN, title: "Encoded" },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...undefineds,
        report_forecast_token: ENCODED_TOKEN,
        title: "Encoded",
      });
      expect(res).toEqual({ ...successData, token: ENCODED_TOKEN, title: "Encoded" });
    },
  },
  {
    name: "requires at least one mutable field",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        report_forecast_token: TOKEN,
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message:
              "At least one of title, scenario_model_tokens, business_metric_token, or set_as_default must be provided",
          },
        ],
      });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
        params: {
          title: "Updated Board Plan",
        },
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Scenario models are not enabled for this account." }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        report_forecast_token: TOKEN,
        title: "Updated Board Plan",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Scenario models are not enabled for this account." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
