import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/enrichment-sources/list-enrichment-sources";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  page: 1,
} as const;
const params = {
  page: 1,
  limit: DEFAULT_LIMIT,
};
const response: ResponseBodyForPathAndMethod<"/v2/enrichment_sources", "GET"> = {
  links: {
    next: "https://api.vantage.sh/v2/enrichment_sources?page=2",
  },
  enrichment_sources: [
    {
      token: "srvc_data_intgrtn_10401e8ad614f27b",
      type: "custom_llm_enrichment_source",
      title: "Custom LLM Enrichment",
      integration_token: "accss_crdntl_99664b33437f4530",
      active: true,
      created_at: "2026-09-15T20:01:18Z",
    },
  ],
};

testTool(
  tool,
  [{ name: "valid arguments", data: args }],
  [
    {
      name: "successful request",
      apiCallHandler: requestsInOrder([
        { endpoint: "/v2/enrichment_sources", params, method: "GET", result: { ok: true, data: response } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({
          enrichment_sources: response.enrichment_sources,
          pagination: { hasNextPage: true, nextPage: 2 },
        });
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources",
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
      name: "default page and last page",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources",
          params,
          method: "GET",
          result: { ok: true, data: { ...response, links: { next: null } } },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({ ...args, page: undefined });
        expect(result).toEqual({
          enrichment_sources: response.enrichment_sources,
          pagination: { hasNextPage: false, nextPage: 0 },
        });
      },
    },
  ]
);

test.each([
  {
    page: 0,
  },
  {
    page: 1.5,
  },
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
