import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/ingest-tokens/list-ingest-tokens";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  feed_token: "srvc_data_intgrtn_123",
  page: 1,
} as const;
const params = {
  feed_token: "srvc_data_intgrtn_123",
  page: 1,
  limit: DEFAULT_LIMIT,
};
const response: ResponseBodyForPathAndMethod<"/v2/ingest_tokens", "GET"> = {
  links: {
    next: "https://api.vantage.sh/v2/ingest_tokens?page=2",
  },
  tokens: [
    {
      token: "tlm_tok_08dacbf0109f9235",
      feed_token: "srvc_data_intgrtn_93d9727e64d4327e",
      provider: "bifrost",
      name: "Production",
      last4: "zkDQ",
      retention_days: 30,
      issued_at: "2026-11-11T12:00:00Z",
      expires_at: "2027-01-11T12:00:00Z",
      revoked_at: null,
      created_by: "usr_729dc9281dcb3c73",
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
        { endpoint: "/v2/ingest_tokens", params, method: "GET", result: { ok: true, data: response } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({
          tokens: response.tokens,
          pagination: { hasNextPage: true, nextPage: 2 },
        });
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/ingest_tokens",
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
          endpoint: "/v2/ingest_tokens",
          params,
          method: "GET",
          result: { ok: true, data: { ...response, links: { next: null } } },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({ ...args, page: undefined });
        expect(result).toEqual({ tokens: response.tokens, pagination: { hasNextPage: false, nextPage: 0 } });
      },
    },
  ]
);

test.each([
  {
    feed_token: "wrong_123",
    page: 1,
  },
  {
    page: 1,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    page: 0,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    page: 1.5,
  },
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
