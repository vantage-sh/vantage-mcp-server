import type { ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import z from "zod";
import tool from "../../../src/tools/enrichment-sources/list-enrichment-source-cost-integrations";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  enrichment_source_token: "srvc_data_intgrtn_123",
  page: 1,
} as const;
const params = {
  page: 1,
  limit: DEFAULT_LIMIT,
};
const response: ResponseBodyForPathAndMethod<"/v2/enrichment_sources/srvc_data_intgrtn_123/cost_integrations", "GET"> =
  {
    links: {
      next: "https://api.vantage.sh/v2/enrichment_sources/{enrichment_source_token}/cost_integrations?page=2",
    },
    cost_integrations: [
      {
        token: "accss_crdntl_51cc69c51624caf4",
        provider: "aws",
        account_identifier: "606441991586",
        status: "pending",
        last_updated: null,
        workspace_tokens: ["wrkspc_5019ac56ac17dd58"],
        created_at: "2026-11-10T22:13:57Z",
        managed_account_tokens: [],
        enriched_by: [
          "srvc_data_intgrtn_1e315a6237dfd2e1",
          "srvc_data_intgrtn_5976ebd11302daa2",
          "srvc_data_intgrtn_60a40c37820efd44",
          "srvc_data_intgrtn_8a0519d49bf04d02",
        ],
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
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/cost_integrations",
          params,
          method: "GET",
          result: { ok: true, data: response },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({
          cost_integrations: response.cost_integrations,
          pagination: { hasNextPage: true, nextPage: 2 },
        });
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/cost_integrations",
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
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123/cost_integrations",
          params,
          method: "GET",
          result: { ok: true, data: { ...response, links: { next: null } } },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({ ...args, page: undefined });
        expect(result).toEqual({
          cost_integrations: response.cost_integrations,
          pagination: { hasNextPage: false, nextPage: 0 },
        });
      },
    },
    {
      name: "encodes path tokens",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/enrichment_sources/srvc_data_intgrtn_123%2Fpart%3F/cost_integrations",
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
  },
  {
    page: 1,
  },
  {
    enrichment_source_token: "srvc_data_intgrtn_123",
    page: 0,
  },
  {
    enrichment_source_token: "srvc_data_intgrtn_123",
    page: 1.5,
  },
])("rejects invalid arguments %#", (input) => {
  expect(z.object(tool.args).safeParse(input).success).toBe(false);
});
