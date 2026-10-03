import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/billing-rules/delete-billing-rule";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = { token: "bllng_rule_fb27faa25ef5ea72" };

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
      name: "takes billing_rule_token",
      data: {
        billing_rule_token: "bllng_rule_fb27faa25ef5ea72",
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_rules/${pathEncode("bllng_rule_fb27faa25ef5ea72")}`,
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
          billing_rule_token: "bllng_rule_fb27faa25ef5ea72",
        });
        expect(res).toEqual({ token: "bllng_rule_fb27faa25ef5ea72" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/billing_rules/${pathEncode("bllng_rule_nonexistent")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Billing rule not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          billing_rule_token: "bllng_rule_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Billing rule not found" }],
        });
      },
    },
  ]
);
