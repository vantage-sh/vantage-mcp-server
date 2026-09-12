import { pathEncode, type SendInvoiceResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/send-invoice";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { INVOICE_TOKEN } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts an invoice token",
    data: {
      invoice_token: INVOICE_TOKEN,
    },
  },
];

const successData: SendInvoiceResponse = {
  recipients: ["billing@example.com"],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/send`,
        params: {},
        method: "POST",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({ invoice_token: INVOICE_TOKEN });
      expect(result).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/send`,
        params: {},
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Invoice cannot be sent" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({ invoice_token: INVOICE_TOKEN });
      expect(error.exception).toEqual({
        errors: [{ message: "Invoice cannot be sent" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
