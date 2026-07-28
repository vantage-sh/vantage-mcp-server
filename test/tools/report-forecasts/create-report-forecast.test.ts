import type { CreateReportForecastResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-forecasts/create-report-forecast";
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
  scenario_model_tokens: undefined,
  business_metric_token: undefined,
  set_as_default: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  cost_report_token: "rprt_82a0304aaf254804",
  title: "Operating Plan",
  scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
  business_metric_token: "bsnss_mtrc_124dc3483510ac35",
  set_as_default: true,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "scenario models only",
    data: {
      ...undefineds,
      cost_report_token: "rprt_82a0304aaf254804",
      title: "Operating Plan",
      scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
    },
  },
  {
    name: "business metric only",
    data: {
      ...undefineds,
      cost_report_token: "rprt_82a0304aaf254804",
      title: "Metric Plan",
      business_metric_token: "bsnss_mtrc_124dc3483510ac35",
    },
  },
  {
    name: "all valid arguments",
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
    name: "empty cost_report_token",
    data: {
      ...validInputArguments,
      cost_report_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "nullable business_metric_token",
    data: {
      ...undefineds,
      cost_report_token: "rprt_82a0304aaf254804",
      title: "Clear Metric",
      scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
      business_metric_token: null,
    },
  },
];

const successData: CreateReportForecastResponse = {
  token: "rprt_frcst_5d4cc7ef29bed6d2",
  title: "Operating Plan",
  cost_report_token: "rprt_82a0304aaf254804",
  scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
  business_metric_token: "bsnss_mtrc_124dc3483510ac35",
  is_default: true,
  created_by_token: "usr_10a09baaa100511e",
  created_at: "2026-07-28T15:37:52Z",
  updated_at: "2026-07-28T15:37:52Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_forecasts",
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
    name: "requires scenario models or business metric",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_82a0304aaf254804",
        title: "Missing Assignment",
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message: "At least one of scenario_model_tokens or business_metric_token must be provided",
          },
        ],
      });
    },
  },
  {
    name: "rejects empty scenario_model_tokens alone",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_82a0304aaf254804",
        title: "Empty Models",
        scenario_model_tokens: [],
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message: "At least one of scenario_model_tokens or business_metric_token must be provided",
          },
        ],
      });
    },
  },
  {
    name: "rejects null business_metric_token alone",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_82a0304aaf254804",
        title: "Null Metric",
        business_metric_token: null,
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message: "At least one of scenario_model_tokens or business_metric_token must be provided",
          },
        ],
      });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_forecasts",
        params: {
          ...undefineds,
          cost_report_token: "rprt_82a0304aaf254804",
          title: "Operating Plan",
          scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Scenario models are not enabled for this account." }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_82a0304aaf254804",
        title: "Operating Plan",
        scenario_model_tokens: ["frcst_mdl_ebb14bfd8eabc5fd"],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Scenario models are not enabled for this account." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
