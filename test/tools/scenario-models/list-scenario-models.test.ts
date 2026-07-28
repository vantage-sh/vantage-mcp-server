import type { GetScenarioModelsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/scenario-models/list-scenario-models";
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

const validArguments: InferValidators<Validators> = {
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData: GetScenarioModelsResponse = {
  scenario_models: [
    {
      token: "frcst_mdl_47f8f6511171bc8f",
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
    },
  ],
  links: {
    self: "https://api.vantage.sh/v2/scenario_models?page=1",
    first: "https://api.vantage.sh/v2/scenario_models?page=1",
    next: "https://api.vantage.sh/v2/scenario_models?page=2",
    last: "https://api.vantage.sh/v2/scenario_models?page=2",
    prev: null,
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/scenario_models",
        params: {
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
        scenario_models: successData.scenario_models,
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
        endpoint: "/v2/scenario_models",
        params: {
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
