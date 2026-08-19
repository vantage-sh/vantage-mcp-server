import { type GetVirtualTagConfigResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-configs/get-virtual-tag-config";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  virtual_tag_config_token: "vtag_123",
};

const successData: GetVirtualTagConfigResponse = {
  token: "vtag_123",
  created_by_token: null,
  key: "team",
  hidden: false,
  preferred: false,
  overridable: true,
  backfill_until: "2026-01-01",
  collapsed_tag_keys: [],
  values: [
    {
      token: "vtag_val_456",
      filter: "costs.provider = 'aws'",
      name: "Platform",
      label_transforms: [],
      percentages: [],
      date_ranges: [],
    },
    {
      token: "vtag_val_789",
      filter: "costs.provider = 'gcp'",
      name: "Product",
      label_transforms: [],
      percentages: [],
      date_ranges: [],
    },
  ],
};

testTool(
  tool,
  [{ name: "valid token", data: validArguments }],
  [
    {
      name: "returns the config with all values",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
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
          endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
          params: {},
          method: "GET",
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
  ]
);
