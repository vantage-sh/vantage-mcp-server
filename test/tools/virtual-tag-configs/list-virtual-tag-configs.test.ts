import type { GetVirtualTagConfigsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-configs/list-virtual-tag-configs";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  q: "team",
};

const successData: GetVirtualTagConfigsResponse = {
  virtual_tag_configs: [
    {
      token: "vtag_123",
      created_by_token: null,
      key: "team",
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
      ],
    },
  ],
};

testTool(
  tool,
  [
    { name: "lists all configs", data: { q: undefined } },
    { name: "searches configs by key", data: validArguments },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/virtual_tag_configs",
          params: validArguments,
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
          endpoint: "/v2/virtual_tag_configs",
          params: validArguments,
          method: "GET",
          result: { ok: false, errors: [{ message: "Access denied" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(validArguments);
        expect(error.exception).toEqual({ errors: [{ message: "Access denied" }] });
      },
    },
  ]
);
