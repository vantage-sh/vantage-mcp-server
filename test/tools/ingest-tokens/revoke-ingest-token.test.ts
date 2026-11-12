import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/ingest-tokens/revoke-ingest-token";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  ingest_token: "tlm_tok_123",
} as const;
const params = {};
const response: ResponseBodyForPathAndMethod<"/v2/ingest_tokens/tlm_tok_123/revoke", "POST"> = {
  token: "tlm_tok_b10bef544f7f324b",
  feed_token: "srvc_data_intgrtn_db12bf82d85fa6ca",
  provider: "bifrost",
  name: null,
  last4: "HKAw",
  retention_days: null,
  issued_at: "2026-11-11T12:00:00Z",
  expires_at: "2028-05-11T12:00:00Z",
  revoked_at: "2026-11-11T12:00:00Z",
  created_by: "usr_68164c550d677188",
};

testTool(
  tool,
  [{ name: "valid arguments", data: args }],
  [
    {
      name: "successful request",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/ingest_tokens/tlm_tok_123/revoke",
          params,
          method: "POST",
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
          endpoint: "/v2/ingest_tokens/tlm_tok_123/revoke",
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
    {
      name: "encodes path tokens",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/ingest_tokens/tlm_tok_123%2Fpart%3F/revoke",
          params,
          method: "POST",
          result: { ok: true, data: response },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        await callExpectingSuccess({ ...args, ingest_token: "tlm_tok_123/part?" });
      },
    },
  ]
);

test.each([
  {
    ingest_token: "wrong_123",
  },
  {},
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
