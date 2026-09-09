import { type GetInvoiceCostReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/invoices/get-invoice-cost-report";
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

const successData: GetInvoiceCostReportResponse = {
  cost_report_url: "https://console.vantage.sh/costs/rprt_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/cost_report`,
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
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/invoices/${pathEncode(INVOICE_TOKEN)}/cost_report`,
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
