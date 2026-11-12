import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/enrichment-sources/get-enrichment-statistics";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  enrichment_source_token: "srvc_data_intgrtn_123",
  page: 1,
  provider: "aws",
} as const;
const params = {
  page: 1,
  provider: "aws",
  limit: DEFAULT_LIMIT,
};
const response: ResponseBodyForPathAndMethod<"/v2/enrichment_sources/srvc_data_intgrtn_123/statistics", "GET"> = {
  links: {
    next: "https://api.vantage.sh/v2/enrichment_sources/{enrichment_source_token}/statistics?page=2",
  },
  enrichment_statistics: [
    {
      token: "wrkflw_mnfst_ddf884f31e7edbba",
      provider: "aws",
      account_identifier: "157844646115",
      status: "success",
      status_detail: null,
      status_message: null,
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      ingested_at: "2026-09-01T12:00:00Z",
      log_scan_acceptance_rate: 0.99,
      log_record_match_rate: 0.98,
      bill_match_rate: 0.97,
      ambiguous_sibling_rows: 0,
      tokens_kept_rate: 0.96,
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
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/statistics",
          params,
          method: "GET",
          result: { ok: true, data: response },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({
          enrichment_statistics: response.enrichment_statistics,
          pagination: { hasNextPage: true, nextPage: 2 },
        });
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/statistics",
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
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/statistics",
          params,
          method: "GET",
          result: { ok: true, data: { ...response, links: { next: null } } },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({ ...args, page: undefined });
        expect(result).toEqual({
          enrichment_statistics: response.enrichment_statistics,
          pagination: { hasNextPage: false, nextPage: 0 },
        });
      },
    },
    {
      name: "encodes path tokens",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123%2Fpart%3F/statistics",
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
    page: 1,
    provider: "aws",
  },
  {
    page: 1,
    provider: "aws",
  },
  {
    enrichment_source_token: "srvc_data_intgrtn_123",
    page: 0,
    provider: "aws",
  },
  {
    enrichment_source_token: "srvc_data_intgrtn_123",
    page: 1.5,
    provider: "aws",
  },
  {
    enrichment_source_token: "srvc_data_intgrtn_123",
    page: 1,
    provider: "invalid",
  },
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
