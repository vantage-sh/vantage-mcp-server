import { type GetVirtualTagConfigValueResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-config-values/get-virtual-tag-config-value";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validArguments = {
  virtual_tag_config_token: "vtag_123",
  virtual_tag_config_value_token: "vtag_val_456",
};

const successData: GetVirtualTagConfigValueResponse = {
  token: "vtag_val_456",
  filter: "costs.provider = 'aws'",
  name: "AWS",
  label_transforms: [],
  percentages: [],
  date_ranges: [],
};

const validOutput = successData;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(tool, [{ name: "valid tokens", data: validArguments }], outputSchemaTests, [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values/${pathEncode("vtag_val_456")}`,
        params: {},
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values/${pathEncode("vtag_val_456")}`,
        params: {},
        method: "GET",
        result: { ok: false, errors: [{ message: "VirtualTagConfigValue not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "VirtualTagConfigValue not found" }],
      });
    },
  },
]);
