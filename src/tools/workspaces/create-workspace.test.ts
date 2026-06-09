import type { CreateWorkspaceResponse } from "@vantage-sh/vantage-client";
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
import tool from "./create-workspace";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  enable_currency_conversion: undefined,
  currency: undefined,
  exchange_rate_date: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  name: "Engineering",
};

const validInputArguments: InferValidators<Validators> = {
  name: "Engineering",
  enable_currency_conversion: true,
  currency: "JPY",
  exchange_rate_date: "end_of_billing_period_rate",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidInputArguments,
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
];

const successData: CreateWorkspaceResponse = {
  token: "wrkspc_c820c203e53de3e1",
  name: "Engineering",
  created_at: "2024-10-01T01:00:55Z",
  enable_currency_conversion: true,
  currency: "JPY",
  exchange_rate_date: "end_of_billing_period_rate",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/workspaces",
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
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/workspaces",
        params: minimalValidInputArguments,
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Name has already been taken" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Name has already been taken" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
