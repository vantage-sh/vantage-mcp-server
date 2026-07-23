import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../../src/utils/testing";
import tool from "../../../src/tools/recommendation-views/delete-recommendation-view";

testTool(
  tool,
  [
    {
      name: "takes recommendation_view_token",
      data: {
        recommendation_view_token: "rcmvw_123",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/recommendation_views/${pathEncode("rcmvw_123")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          recommendation_view_token: "rcmvw_123",
        });
        expect(res).toEqual({ token: "rcmvw_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/recommendation_views/${pathEncode("rcmvw_notfound")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Recommendation view not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          recommendation_view_token: "rcmvw_notfound",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Recommendation view not found" }],
        });
      },
    },
  ]
);
