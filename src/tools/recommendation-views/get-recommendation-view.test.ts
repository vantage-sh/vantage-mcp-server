import { type GetRecommendationViewResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./get-recommendation-view";

const success: GetRecommendationViewResponse = {
  token: "rec_vw_be3f24eb1b5aabf6",
  title: "Production Recommendations",
  workspace_token: "wrkspc_be6568a301b1d06c",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  provider_ids: ["aws", "gcp"],
  billing_account_ids: [],
  account_ids: ["123456789012"],
  regions: ["us-east-1", "us-west-2"],
  tag_key: "environment",
  tag_value: "production",
  created_at: "2024-07-15T16:08:54Z",
  created_by: "team_73f6001f98e9012b",
};

testTool(
  tool,
  [
    {
      name: "takes recommendation_view_token",
      data: {
        recommendation_view_token: "rec_vw_be3f24eb1b5aabf6",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/recommendation_views/${pathEncode("rec_vw_be3f24eb1b5aabf6")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          recommendation_view_token: "rec_vw_be3f24eb1b5aabf6",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/recommendation_views/${pathEncode("rec_vw_missing")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Recommendation view not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          recommendation_view_token: "rec_vw_missing",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Recommendation view not found" }],
        });
      },
    },
  ]
);
