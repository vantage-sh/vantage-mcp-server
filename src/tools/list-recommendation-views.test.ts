import type { GetRecommendationViewsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-recommendation-views";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  limit: 10,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "all valid arguments",
    data: validArguments,
  },
];

function makeRecommendationView(token: string) {
  return {
    token,
    title: `Recommendation View ${token}`,
    workspace_token: "wrkspc_123",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    provider_ids: ["aws", "gcp"],
    billing_account_ids: [],
    account_ids: ["123456789012"],
    regions: ["us-east-1", "us-west-2"],
    tag_key: "environment",
    tag_value: "production",
    created_at: "2024-07-15T16:08:53Z",
    created_by: "usr_123",
  };
}

const successData: GetRecommendationViewsResponse = {
  recommendation_views: [makeRecommendationView("rec_vw_123"), makeRecommendationView("rec_vw_456")],
  links: {
    next: "https://api.vantage.sh/v2/recommendation_views?page=2",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: validArguments,
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        recommendation_views: successData.recommendation_views,
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: validArguments,
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
