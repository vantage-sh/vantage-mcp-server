import { type GetInvoiceResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/get-invoice";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { INVOICE_TOKEN, invoice } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts an invoice token",
    data: {
      invoice_token: INVOICE_TOKEN,
    },
  },
  {
    name: "rejects another token kind",
    data: {
      invoice_token: "rprt_123",
    },
    expectedIssues: ["Must be a Invoice token (msp_inv_*)"],
  },
];

const successData: GetInvoiceResponse = invoice;

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}`,
        params: {},
        method: "GET",
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
    name: "encodes the token in the path",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode("msp_inv_a/b")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      await callExpectingSuccess({ invoice_token: "msp_inv_a/b" });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Invoice not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({ invoice_token: INVOICE_TOKEN });
      expect(error.exception).toEqual({
        errors: [{ message: "Invoice not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
