import { type GetSavedFilterResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/saved-filters/get-saved-filter";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const success: GetSavedFilterResponse = {
  token: "svd_fltr_123",
  title: "AWS costs",
  cost_report_tokens: ["rprt_123"],
  filter: "costs.provider = 'aws'",
  created_at: "2024-07-15T16:08:53Z",
  created_by: "usr_123",
  workspace_token: "wrkspc_123",
};
const args = { saved_filter_token: "svd_fltr_123" };
const endpoint = `/v2/saved_filters/${pathEncode(args.saved_filter_token)}`;

testTool(
  tool,
  [
    { name: "valid token", data: args },
    {
      name: "rejects wrong token kind",
      data: { saved_filter_token: "rprt_123" },
      expectedIssues: ["Must be a Saved Filter token (svd_fltr_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([{ endpoint, params: {}, method: "GET", result: { ok: true, data: success } }]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(success);
      },
    },
    {
      name: "API failure",
      apiCallHandler: requestsInOrder([
        { endpoint, params: {}, method: "GET", result: { ok: false, errors: [{ message: "Not found" }] } },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        expect((await callExpectingMCPUserError(args)).exception).toEqual({ errors: [{ message: "Not found" }] });
      },
    },
  ]
);
