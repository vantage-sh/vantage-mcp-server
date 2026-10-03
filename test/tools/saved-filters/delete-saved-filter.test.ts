import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/saved-filters/delete-saved-filter";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const args = { saved_filter_token: "svd_fltr_123" };
const endpoint = `/v2/saved_filters/${pathEncode(args.saved_filter_token)}`;

const validOutput = { token: args.saved_filter_token };

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
    { name: "valid token", data: args },
    {
      name: "rejects wrong token kind",
      data: { saved_filter_token: "rprt_123" },
      expectedIssues: ["Must be a Saved Filter token (svd_fltr_*)"],
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful 204 call",
      apiCallHandler: requestsInOrder([
        { endpoint, params: {}, method: "DELETE", result: { ok: true, data: undefined } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({ token: args.saved_filter_token });
      },
    },
    {
      name: "API failure",
      apiCallHandler: requestsInOrder([
        { endpoint, params: {}, method: "DELETE", result: { ok: false, errors: [{ message: "Not found" }] } },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        expect((await callExpectingMCPUserError(args)).exception).toEqual({ errors: [{ message: "Not found" }] });
      },
    },
  ]
);
