import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../utils/testing";
import { DEFAULT_LIMIT } from "../structure/constants";
import tool from "./list-exchange-rates";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  limit: DEFAULT_LIMIT,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
      limit: DEFAULT_LIMIT,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData = {
  exchange_rates: [
    {
      base_currency_code: "USD",
      currency_code: "PHP",
      rate: "300.011",
      effective_date: "2025-09-01",
      updated_at: "2025-09-10 00:05:41 UTC",
    },
  ],
  meta: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/exchange_rates",
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
        exchange_rates: successData.exchange_rates,
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
        endpoint: "/v2/exchange_rates",
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
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
