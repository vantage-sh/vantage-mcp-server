import { pathEncode } from "@vantage-sh/vantage-client";
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
import tool from "./delete-financial-commitment-report";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  financial_commitment_report_token: "fncl_cmnt_rprt_28bc840bf137769c",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes financial_commitment_report_token",
    data: validArguments,
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode(validArguments.financial_commitment_report_token)}`,
        params: validArguments,
        method: "DELETE",
        result: {
          ok: true,
          data: undefined,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toBeUndefined();
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_nonexistent")}`,
        params: {
          financial_commitment_report_token: "fncl_cmnt_rprt_nonexistent",
        },
        method: "DELETE",
        result: {
          ok: false,
          errors: [{ message: "Financial commitment report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        financial_commitment_report_token: "fncl_cmnt_rprt_nonexistent",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Financial commitment report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
