import type { CreateInvoiceResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/create-invoice";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { invoice } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  billing_period_start: "2026-08-01",
  billing_period_end: "2026-08-31",
  account_token: "acct_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts valid arguments",
    data: validArguments,
  },
  poisonOneValue(validArguments, "billing_period_start", dateValidatorPoisoner),
  poisonOneValue(validArguments, "billing_period_end", dateValidatorPoisoner),
];

const successData: CreateInvoiceResponse = invoice;

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/invoices",
        params: validArguments,
        method: "POST",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual(successData);
    },
  },
  {
    name: "rejects a reversed billing period",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...validArguments,
        billing_period_start: "2026-08-31",
        billing_period_end: "2026-08-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "billing_period_start must be on or before billing_period_end" }],
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/invoices",
        params: validArguments,
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Managed account not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "Managed account not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
