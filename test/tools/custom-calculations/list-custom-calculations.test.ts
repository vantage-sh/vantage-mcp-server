import { expect } from "vitest";
import tool from "../../../src/tools/custom-calculations/list-custom-calculations";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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
const validArguments: InferValidators<Validators> = { page: undefined };
const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "valid input", data: validArguments },
  { name: "rejects page zero", data: { page: 0 }, expectedIssues: ["Too small: expected number to be >=1"] },
  {
    name: "rejects fractional page",
    data: { page: 1.5 },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
];
const executionTests: ExecutionTestTableItem<Validators, undefined>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/custom_calculations",
        params: { page: 1, limit: DEFAULT_LIMIT },
        method: "GET",
        result: {
          ok: true,
          data: {
            custom_calculations: [calculation],
            links: { next: "https://api.vantage.sh/v2/custom_calculations?page=2" },
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        custom_calculations: [calculation],
        pagination: { nextPage: 2, hasNextPage: true },
      });
    },
  },
  {
    name: "passes flag-off API errors through",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/custom_calculations",
        params: { page: 1, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: false, errors: ["Custom Calculations are not enabled for this account."] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({ errors: ["Custom Calculations are not enabled for this account."] });
    },
  },
  {
    name: "last page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/custom_calculations",
        params: { page: 2, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: true, data: { custom_calculations: [] } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess({ page: 2 })).toEqual({
        custom_calculations: [],
        pagination: { nextPage: 0, hasNextPage: false },
      });
    },
  },
];
testTool(tool, argumentSchemaTests, executionTests);
