import { expect } from "vitest";
import tool from "../../../src/tools/custom-calculations/create-custom-calculation";
import {
  type ExecutionTestTableItem,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { calculation, divisionFilter, filter } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
const validArguments: InferValidators<Validators> = {
  title: calculation.title,
  filter,
  operation: undefined,
  display_as: undefined,
  unit_scale: undefined,
};
const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts operand without type metadata",
    data: { ...validArguments, filter: { filter: "", usage_unit: null } },
  },
  {
    name: "accepts division without type metadata",
    data: {
      ...validArguments,
      operation: "division",
      filter: {
        filter_numerator: "",
        usage_unit_numerator: null,
        filter_denominator: "",
        usage_unit_denominator: "Tokens",
      },
    },
  },
  { name: "valid input", data: validArguments },
  {
    name: "rejects blank title",
    data: { ...validArguments, title: "  " },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects invalid operation",
    data: { ...validArguments, operation: "multiply" as never },
    expectedIssues: ['Invalid option: expected one of "sum"|"average"|"division"|"min"|"max"'],
  },
  {
    name: "rejects invalid display format",
    data: { ...validArguments, display_as: "currency" as never },
    expectedIssues: ['Invalid option: expected one of "ratio"|"percent"|"per-n"'],
  },
  {
    name: "rejects fractional unit scale",
    data: { ...validArguments, unit_scale: 1.5 },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
  {
    name: "accepts division filter",
    data: {
      ...validArguments,
      operation: "division",
      filter: divisionFilter,
      display_as: "per-n",
      unit_scale: 1000000,
    },
  },
  {
    name: "requires division denominator",
    data: { ...validArguments, filter: { ...divisionFilter, filter_denominator: undefined as never } },
    expectedIssues: ["Invalid input"],
  },
  {
    name: "requires filter JSON",
    data: { ...validArguments, filter: undefined as never },
    expectedIssues: ["Invalid input"],
  },
  {
    name: "rejects VQL string instead of filter JSON",
    data: { ...validArguments, filter: "costs.provider = 'aws'" as never },
    expectedIssues: ["Invalid input"],
  },
];
const executionTests: ExecutionTestTableItem<Validators, undefined>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/custom_calculations",
        params: { title: calculation.title, filter },
        method: "POST",
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
        endpoint: "/v2/custom_calculations",
        params: { title: calculation.title, filter },
        method: "POST",
        result: { ok: false, errors: ["Custom Calculations are not enabled for this account."] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({ errors: ["Custom Calculations are not enabled for this account."] });
    },
  },
  ...(["sum", "average", "min", "max", "division"] as const).map(
    (operation) =>
      ({
        name: `forwards ${operation} definition`,
        apiCallHandler: requestsInOrder([
          {
            endpoint: "/v2/custom_calculations",
            params: {
              title: calculation.title,
              operation,
              filter: operation === "division" ? divisionFilter : { ...filter, type: operation },
              display_as: "per-n",
              unit_scale: 1000000,
            },
            method: "POST",
            result: { ok: true, data: calculation },
          },
        ]),
        handler: async ({ callExpectingSuccess }) => {
          expect(
            await callExpectingSuccess({
              ...validArguments,
              operation,
              filter: operation === "division" ? divisionFilter : { ...filter, type: operation },
              display_as: "per-n",
              unit_scale: 1000000,
            })
          ).toEqual(calculation);
        },
      }) satisfies ExecutionTestTableItem<Validators, undefined>
  ),
];
testTool(tool, argumentSchemaTests, executionTests);
