import { pathEncode, type UpdateScenarioModelResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/scenario-models/update-scenario-model";
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

const undefineds = {
  title: undefined,
  priority: undefined,
  provider: undefined,
  service: undefined,
  workspace_token: undefined,
  periods: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  scenario_model_token: TOKEN,
  title: "Updated Hiring Plan",
  priority: null,
  provider: null,
  service: null,
  workspace_token: "wrkspc_123",
  periods: [
    {
      start_at: "2026-01-01",
      end_at: null,
      amount: 500,
      amount_type: "dollar",
    },
  ],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "title only",
    data: {
      ...undefineds,
      scenario_model_token: TOKEN,
      title: "Updated Title",
    },
  },
  {
    name: "all valid arguments including clears",
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
    name: "invalid amount_type",
    data: {
      ...undefineds,
      scenario_model_token: TOKEN,
      periods: [
        {
          start_at: "2026-01-01",
          amount: 100,
          amount_type: "euros" as "dollar",
        },
      ],
    },
    expectedIssues: ['Invalid option: expected one of "dollar"|"percent"'],
  },
  {
    name: "invalid start_at date",
    data: {
      ...undefineds,
      scenario_model_token: TOKEN,
      periods: [
        {
          start_at: "not-a-date",
          amount: 100,
          amount_type: "dollar",
        },
      ],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
];

const successData: UpdateScenarioModelResponse = {
  token: TOKEN,
  title: "Updated Hiring Plan",
  priority: null,
  workspace_token: "wrkspc_123",
  provider: null,
  service: null,
  periods: [
    {
      start_at: "2026-01-01",
      end_at: null,
      amount: "500.0",
      amount_type: "dollar",
    },
  ],
  created_by_token: "usr_41333d06c73b9405",
  created_at: "2026-07-28T15:37:49Z",
  updated_at: "2026-07-28T16:00:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful clear and replace periods",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
        params: {
          title: "Updated Hiring Plan",
          priority: null,
          provider: null,
          service: null,
          workspace_token: "wrkspc_123",
          periods: [
            {
              start_at: "2026-01-01",
              end_at: null,
              amount: 500,
              amount_type: "dollar",
            },
          ],
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
        endpoint: `/v2/scenario_models/${pathEncode(ENCODED_TOKEN)}`,
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
        scenario_model_token: ENCODED_TOKEN,
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
        scenario_model_token: TOKEN,
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message: "At least one of title, priority, provider, service, or periods must be provided",
          },
        ],
      });
    },
  },
  {
    name: "requires workspace_token when provider is set",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        scenario_model_token: TOKEN,
        provider: "aws",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "workspace_token is required when provider or service is set" }],
      });
    },
  },
  {
    name: "enterprise entitlement error",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/scenario_models/${pathEncode(TOKEN)}`,
        params: {
          title: "Updated Hiring Plan",
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
        scenario_model_token: TOKEN,
        title: "Updated Hiring Plan",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Scenario models are not enabled for this account." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
