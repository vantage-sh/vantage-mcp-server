import type { GetInvoicesResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/list-invoices";
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
import { invoice } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 2,
  managed_account_token: "acct_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "uses the default page",
    data: {
      page: undefined,
      managed_account_token: undefined,
    },
  },
  {
    name: "accepts a managed account filter",
    data: validArguments,
  },
  {
    name: "rejects page zero",
    data: {
      ...validArguments,
      page: 0,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
];

const successData: GetInvoicesResponse = {
  invoices: [invoice],
  links: {
    next: "https://api.vantage.sh/v2/invoices?page=3",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/invoices",
        params: {
          ...validArguments,
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
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual({
        invoices: [invoice],
        pagination: {
          hasNextPage: true,
          nextPage: 3,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/invoices",
        params: {
          ...validArguments,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "MSP invoicing is not enabled" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "MSP invoicing is not enabled" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
