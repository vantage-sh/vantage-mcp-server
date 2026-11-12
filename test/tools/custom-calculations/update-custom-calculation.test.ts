import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/custom-calculations/update-custom-calculation";
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
  custom_calculation_token: calculation.token,
  title: undefined,
  filter: undefined,
  operation: undefined,
  display_as: undefined,
  unit_scale: undefined,
  description: undefined,
  cost_report_tokens: undefined,
};
const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "accepts null scale reset", data: { ...validArguments, unit_scale: null } },
  {
    name: "accepts equivalent usage units",
    data: { ...validArguments, filter: { filter: "", usage_unit: ["Tokens", "tokens"] } },
  },
  {
    name: "rejects empty usage-unit array",
    data: { ...validArguments, filter: { filter: "", usage_unit: [] } },
    expectedIssues: ["Too small: expected array to have >=1 items"],
  },
  {
    name: "rejects blank usage-unit array entry",
    data: { ...validArguments, filter: { filter: "", usage_unit: [" "] } },
    expectedIssues: ["Usage unit names must not be blank"],
  },
  {
    name: "rejects oversized description",
    data: { ...validArguments, description: "x".repeat(10001) },
    expectedIssues: ["Too big: expected string to have <=10000 characters"],
  },
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
    name: "rejects wrong token kind",
    data: { ...validArguments, custom_calculation_token: "rprt_123" },
    expectedIssues: ["Must be a Custom Calculation token (cstm_clcltn_*)"],
  },
  {
    name: "requires token",
    data: { ...validArguments, custom_calculation_token: undefined as never },
    expectedIssues: ["Invalid input: expected string, received undefined"],
  },
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
];
const executionTests: ExecutionTestTableItem<Validators, undefined>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
        params: { title: "Renamed" },
        method: "PUT",
        result: { ok: true, data: calculation },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess({ ...validArguments, title: "Renamed" })).toEqual(calculation);
    },
  },
  {
    name: "passes flag-off API errors through",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
        params: {},
        method: "PUT",
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
            endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
            params: {
              operation,
              filter: operation === "division" ? divisionFilter : { ...filter, type: operation },
              display_as: "per-n",
              unit_scale: 1000000,
            },
            method: "PUT",
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
  ...[undefined, null, [], ["rprt_123", "rprt_456"]].map(
    (tokens) =>
      ({
        name: `preserves attachment replacement input ${JSON.stringify(tokens)}`,
        apiCallHandler: requestsInOrder([
          {
            endpoint: `/v2/custom_calculations/${pathEncode(calculation.token)}`,
            params: { cost_report_tokens: tokens },
            method: "PUT",
            result: { ok: true, data: { ...calculation, is_read_only: true } },
          },
        ]),
        handler: async ({ callExpectingSuccess }) => {
          expect(
            await callExpectingSuccess({
              ...validArguments,
              cost_report_tokens: tokens,
            })
          ).toEqual({ ...calculation, is_read_only: true });
        },
      }) satisfies ExecutionTestTableItem<Validators, undefined>
  ),
];
testTool(tool, argumentSchemaTests, executionTests);
