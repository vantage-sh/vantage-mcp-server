import type { CreateScenarioModelResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/scenario-models/create-scenario-model";
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
  priority: undefined,
  provider: undefined,
  service: undefined,
  workspace_token: undefined,
  periods: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  title: "Hiring Plan",
  priority: 2,
  provider: "aws",
  service: "AmazonEC2",
  workspace_token: "wrkspc_123",
  periods: [
    {
      start_at: "2026-01-01",
      end_at: "2026-03-31",
      amount: 1250.75,
      amount_type: "dollar",
    },
    {
      start_at: "2026-04-01",
      end_at: null,
      amount: 10,
      amount_type: "percent",
    },
  ],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...undefineds,
      title: "Minimal Model",
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
    name: "invalid amount_type",
    data: {
      ...undefineds,
      title: "Bad Amount Type",
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
      title: "Bad Date",
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
  {
    name: "invalid end_at date",
    data: {
      ...undefineds,
      title: "Bad End Date",
      periods: [
        {
          start_at: "2026-01-01",
          end_at: "not-a-date",
          amount: 100,
          amount_type: "dollar",
        },
      ],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "nullable priority and filters",
    data: {
      ...undefineds,
      title: "Clearable Fields",
      priority: null,
      provider: null,
      service: null,
      workspace_token: "wrkspc_123",
    },
  },
  {
    name: "nullable period end_at",
    data: {
      ...undefineds,
      title: "Open Ended",
      periods: [
        {
          start_at: "2026-01-01",
          end_at: null,
          amount: 50,
          amount_type: "percent",
        },
      ],
    },
  },
];

const successData: CreateScenarioModelResponse = {
  token: "frcst_mdl_47f8f6511171bc8f",
  title: "Hiring Plan",
  priority: 2,
  workspace_token: "wrkspc_123",
  provider: "aws",
  service: "AmazonEC2",
  periods: [
    {
      start_at: "2026-01-01",
      end_at: "2026-03-31",
      amount: "1250.75",
      amount_type: "dollar",
    },
    {
      start_at: "2026-04-01",
      end_at: null,
      amount: "10.0",
      amount_type: "percent",
    },
  ],
  created_by_token: "usr_41333d06c73b9405",
  created_at: "2026-07-28T15:37:49Z",
  updated_at: "2026-07-28T15:37:49Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/scenario_models",
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
    name: "requires workspace_token when provider is set",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        title: "Needs Workspace",
        provider: "aws",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "workspace_token is required when provider or service is set" }],
      });
    },
  },
  {
    name: "requires workspace_token when clearing service",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        title: "Needs Workspace",
        service: null,
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
        endpoint: "/v2/scenario_models",
        params: {
          ...undefineds,
          title: "Hiring Plan",
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
        title: "Hiring Plan",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Scenario models are not enabled for this account." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
