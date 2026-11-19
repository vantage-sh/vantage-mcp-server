import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/custom-calculations/get-custom-calculation";
import {
  type ExecutionTestTableItem,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { calculation } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
const validArguments: InferValidators<Validators> = { custom_calculation_token: calculation.token };
const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "valid input", data: validArguments },
  {
    name: "rejects wrong token kind",
    data: { ...validArguments, custom_calculation_token: "rprt_123" },
    expectedIssues: ["Must be a Custom Calculation token (cstm_clcltn_*)"],
  },
  {
    name: "requires token",
    data: { ...validArguments, custom_calculation_token: undefined as never },
    expectedIssues: ["Invalid input: expected string, received undefined"],
  },
];
const executionTests: ExecutionTestTableItem<Validators, undefined>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
        params: {},
        method: "GET",
        result: { ok: true, data: calculation },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual(calculation);
    },
  },
  {
    name: "passes flag-off API errors through",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
        params: {},
        method: "GET",
        result: { ok: false, errors: ["Custom Calculations are not enabled for this account."] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({ errors: ["Custom Calculations are not enabled for this account."] });
    },
  },
];
testTool(tool, argumentSchemaTests, executionTests);
