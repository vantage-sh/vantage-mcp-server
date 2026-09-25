import type { GetSavedFiltersResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/saved-filters/list-saved-filters";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const savedFilter = {
  token: "svd_fltr_123",
  title: "AWS costs",
  cost_report_tokens: ["rprt_123"],
  filter: "costs.provider = 'aws'",
  created_at: "2024-07-15T16:08:53Z",
  created_by: "usr_123",
  workspace_token: "wrkspc_123",
};
const success: GetSavedFiltersResponse = {
  saved_filters: [savedFilter],
  links: { next: "https://api.vantage.sh/v2/saved_filters?page=2" },
};
const args = { page: 1, q: "AWS", workspace_token: "wrkspc_123" };
const params = { ...args, limit: DEFAULT_LIMIT };

testTool(
  tool,
  [
    { name: "valid search", data: args },
    { name: "defaults page", data: { page: undefined, q: undefined, workspace_token: undefined } },
    { name: "rejects zero page", data: { ...args, page: 0 }, expectedIssues: ["Too small: expected number to be >=1"] },
    {
      name: "rejects bad workspace token",
      data: { ...args, workspace_token: "rprt_123" },
      expectedIssues: ["Must be a Workspace token (wrkspc_*)"],
    },
  ],
  [
    {
      name: "successful call with pagination",
      apiCallHandler: requestsInOrder([
        { endpoint: "/v2/saved_filters", params, method: "GET", result: { ok: true, data: success } },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(args)).toEqual({
          saved_filters: [savedFilter],
          pagination: { hasNextPage: true, nextPage: 2 },
        });
      },
    },
    {
      name: "API failure",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/saved_filters",
          params,
          method: "GET",
          result: { ok: false, errors: [{ message: "Access denied" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        expect((await callExpectingMCPUserError(args)).exception).toEqual({ errors: [{ message: "Access denied" }] });
      },
    },
  ]
);
