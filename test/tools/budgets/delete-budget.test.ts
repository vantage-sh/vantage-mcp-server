import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/budgets/delete-budget";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = { token: "bdgt_fb27faa25ef5ea72" };

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(
  tool,
  [
    {
      name: "takes budget_token",
      data: {
        budget_token: "bdgt_fb27faa25ef5ea72",
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budgets/${pathEncode("bdgt_fb27faa25ef5ea72")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          budget_token: "bdgt_fb27faa25ef5ea72",
        });
        expect(res).toEqual({ token: "bdgt_fb27faa25ef5ea72" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/budgets/${pathEncode("bdgt_nonexistent")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Budget not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          budget_token: "bdgt_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Budget not found" }],
        });
      },
    },
  ]
);
