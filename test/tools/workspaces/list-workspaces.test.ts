import { expect } from "vitest";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import tool from "../../../src/tools/workspaces/list-workspaces";
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

const noArguments = {} as InferValidators<Validators>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  limit: DEFAULT_LIMIT,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "no arguments",
    data: noArguments,
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
      const res = await callExpectingSuccess(noArguments);
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
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(noArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
