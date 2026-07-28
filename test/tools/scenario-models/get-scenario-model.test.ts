import { type GetScenarioModelResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/scenario-models/get-scenario-model";
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

const TOKEN = "frcst_mdl_47f8f6511171bc8f";
const ENCODED_TOKEN = "frcst_mdl_a/b";

const validArguments: InferValidators<Validators> = {
  scenario_model_token: TOKEN,
};

const successData: GetScenarioModelResponse = {
  token: TOKEN,
  title: "Hiring Plan",
  priority: 2,
  workspace_token: null,
  provider: null,
  service: null,
  periods: [
    {
      start_at: "2026-01-01",
      end_at: "2026-03-31",
      amount: "1250.75",
      amount_type: "dollar",
    },
  ],
  created_by_token: "usr_41333d06c73b9405",
  created_at: "2026-07-28T15:37:49Z",
  updated_at: "2026-07-28T15:37:49Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "valid token",
    data: validArguments,
  },
  {
    name: "empty token",
    data: {
      scenario_model_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
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
        endpoint: `/v2/scenario_models/${pathEncode(ENCODED_TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: { ...successData, token: ENCODED_TOKEN },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({ scenario_model_token: ENCODED_TOKEN });
      expect(res).toEqual({ ...successData, token: ENCODED_TOKEN });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
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
