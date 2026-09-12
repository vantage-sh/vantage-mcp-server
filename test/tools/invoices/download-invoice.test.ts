import { type DownloadInvoiceResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/download-invoice";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { INVOICE_TOKEN } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  invoice_token: INVOICE_TOKEN,
  file_type: "pdf",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts PDF",
    data: validArguments,
  },
  {
    name: "accepts CSV",
    data: {
      ...validArguments,
      file_type: "csv",
    },
  },
  {
    name: "rejects another file type",
    data: {
      ...validArguments,
      file_type: "xlsx" as "pdf",
    },
    expectedIssues: ['Invalid option: expected one of "pdf"|"csv"'],
  },
];

const successData: DownloadInvoiceResponse = {
  download_url: "https://example.com/invoice.pdf",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/download`,
        params: {
          file_type: "pdf",
        },
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
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/download`,
        params: {
          file_type: "pdf",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Invoice not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "Invoice not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
