import type { CreateSavedFilterResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/saved-filters/create-saved-filter";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = { title: "AWS costs", workspace_token: "wrkspc_123", filter: "costs.provider = 'aws'" };
const success: CreateSavedFilterResponse = {
  token: "svd_fltr_123",
  ...args,
  cost_report_tokens: [],
  created_at: "2024-07-15T16:08:53Z",
  created_by: "usr_123",
};

testTool(
  tool,
  [
    { name: "full request", data: args },
    { name: "minimal request", data: { title: "AWS costs", workspace_token: undefined, filter: undefined } },
    {
      name: "rejects empty title",
      data: { ...args, title: " " },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
    {
      name: "rejects wrong workspace token",
      data: { ...args, workspace_token: "rprt_123" },
      expectedIssues: ["Must be a Workspace token (wrkspc_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        { endpoint: "/v2/saved_filters", params: args, method: "POST", result: { ok: true, data: success } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual(success);
      },
    },
    {
      name: "API failure",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/saved_filters",
          params: args,
          method: "POST",
          result: { ok: false, errors: [{ message: "Invalid VQL" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        expect((await callExpectingMCPUserError(args)).exception).toEqual({ errors: [{ message: "Invalid VQL" }] });
      },
    },
  ]
);
