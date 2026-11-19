import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/ingest-tokens/create-ingest-token";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  feed_token: "srvc_data_intgrtn_123",
  name: "Production",
  expires_at: "2027-01-01T00:00:00Z",
  retention_days: 30,
} as const;
const params = {
  feed_token: "srvc_data_intgrtn_123",
  name: "Production",
  expires_at: "2027-01-01T00:00:00Z",
  retention_days: 30,
};
const response: ResponseBodyForPathAndMethod<"/v2/ingest_tokens", "POST"> = {
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
  plaintext_token: "vntg_ti_REDACTED",
};

testTool(
  tool,
  [{ name: "valid arguments", data: args }],
  [
    {
      name: "successful request",
      apiCallHandler: requestsInOrder([
        { endpoint: "/v2/ingest_tokens", params, method: "POST", result: { ok: true, data: response } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(response);
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/ingest_tokens",
          params,
          method: "POST",
          result: { ok: false, errors: [{ message: "Not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(args);
        expect(error.exception).toEqual({ errors: [{ message: "Not found" }] });
      },
    },
  ]
);

test.each([
  {
    feed_token: "wrong_123",
    name: "Production",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 30,
  },
  {
    name: "Production",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 30,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    name: " ",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 30,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    name: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 30,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    name: "Production",
    expires_at: "2027-01-01",
    retention_days: 30,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    name: "Production",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 0,
  },
  {
    feed_token: "srvc_data_intgrtn_123",
    name: "Production",
    expires_at: "2027-01-01T00:00:00Z",
    retention_days: 1.5,
  },
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});

test("optional creation settings can be omitted", () => {
  expect(z.object(tool.args).parse({ feed_token: args.feed_token })).toEqual({ feed_token: args.feed_token });
});
