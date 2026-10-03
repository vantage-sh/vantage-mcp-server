import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-configs/delete-virtual-tag-config";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validArguments = {
  virtual_tag_config_token: "vtag_123",
};

const validOutput = { token: "vtag_123" };

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(tool, [{ name: "valid token", data: validArguments }], outputSchemaTests, [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
        params: {},
        method: "DELETE",
        result: { ok: true, data: undefined },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual({ token: "vtag_123" });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
        params: {},
        method: "DELETE",
        result: { ok: false, errors: [{ message: "VirtualTagConfig not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "VirtualTagConfig not found" }],
      });
    },
  },
]);
