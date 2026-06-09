import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./list-workspaces";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  page: undefined,
  limit: undefined,
};

const validArguments: InferValidators<Validators> = {
  ...undefineds,
  page: 1,
  limit: 64,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "no arguments",
    data: undefineds,
  },
  {
    name: "page and limit",
    data: validArguments,
  },
];

const successData = {
  workspaces: [
    {
      token: "wrkspc_5d9752a116e4d28e",
      name: "Production",
      created_at: "2024-10-01T01:00:56Z",
      enable_currency_conversion: false,
      currency: "USD",
      exchange_rate_date: "daily_rate" as const,
    },
    {
      token: "wrkspc_9a319290712d817d",
      name: "Staging",
      created_at: "2024-10-01T01:00:56Z",
      enable_currency_conversion: true,
      currency: "EUR",
      exchange_rate_date: "end_of_billing_period_rate" as const,
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/workspaces",
        params: {
          page: 1,
          limit: 64,
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
        workspaces: successData.workspaces,
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
        endpoint: "/v2/workspaces",
        params: {
          page: 1,
          limit: 64,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
