import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/enrichment-sources/get-enrichment-source";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  enrichment_source_token: "srvc_data_intgrtn_123",
} as const;
const params = {};
const response: ResponseBodyForPathAndMethod<"/v2/enrichment_sources/srvc_data_intgrtn_123", "GET"> = {
  token: "srvc_data_intgrtn_efd043917857ecef",
  type: "custom_llm_enrichment_source",
  title: "Custom LLM Enrichment",
  integration_token: "accss_crdntl_cf142684c2a1a783",
  active: true,
  created_at: "2026-09-15T20:01:17Z",
};

testTool(
  tool,
  [{ name: "valid arguments", data: args }],
  [
    {
      name: "successful request",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123",
          params,
          method: "GET",
          result: { ok: true, data: response },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(response);
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123",
          params,
          method: "GET",
          result: { ok: false, errors: [{ message: "Not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(args);
        expect(error.exception).toEqual({ errors: [{ message: "Not found" }] });
      },
    },
    {
      name: "encodes path tokens",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123%2Fpart%3F",
          params,
          method: "GET",
          result: { ok: true, data: response },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        await callExpectingSuccess({ ...args, enrichment_source_token: "srvc_data_intgrtn_123/part?" });
      },
    },
  ]
);

test.each([
  {
    enrichment_source_token: "wrong_123",
  },
  {},
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
