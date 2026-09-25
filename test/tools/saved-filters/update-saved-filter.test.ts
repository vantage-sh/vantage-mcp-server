import { pathEncode, type UpdateSavedFilterResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/saved-filters/update-saved-filter";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = { saved_filter_token: "svd_fltr_123", title: "Azure costs", filter: "costs.provider = 'azure'" };
const body = { title: args.title, filter: args.filter };
const endpoint = `/v2/saved_filters/${pathEncode(args.saved_filter_token)}`;
const success: UpdateSavedFilterResponse = {
  token: args.saved_filter_token,
  ...body,
  cost_report_tokens: ["rprt_123"],
  created_at: "2024-07-15T16:08:53Z",
  created_by: "usr_123",
  workspace_token: "wrkspc_123",
};

testTool(
  tool,
  [
    { name: "full request", data: args },
    { name: "title only", data: { saved_filter_token: args.saved_filter_token, title: args.title, filter: undefined } },
    {
      name: "rejects empty title",
      data: { ...args, title: " " },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
    {
      name: "rejects wrong token kind",
      data: { ...args, saved_filter_token: "rprt_123" },
      expectedIssues: ["Must be a Saved Filter token (svd_fltr_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([{ endpoint, params: body, method: "PUT", result: { ok: true, data: success } }]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(success);
      },
    },
    {
      name: "API failure",
      apiCallHandler: requestsInOrder([
        { endpoint, params: body, method: "PUT", result: { ok: false, errors: [{ message: "Invalid VQL" }] } },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        expect((await callExpectingMCPUserError(args)).exception).toEqual({ errors: [{ message: "Invalid VQL" }] });
      },
    },
  ]
);
