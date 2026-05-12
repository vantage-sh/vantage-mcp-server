import type { GetRecommendationViewsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-recommendation-views";
import { DEFAULT_LIMIT } from "./structure/constants";
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
    name: "default pagination arguments",
    data: {
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "valid pagination arguments",
    data: validArguments,
  },
  {
    name: "invalid page below minimum",
    data: {
      page: 0,
      limit: undefined,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "invalid fractional page",
    data: {
      page: 1.5,
      limit: undefined,
    },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
  {
    name: "invalid limit below minimum",
    data: {
      page: undefined,
      limit: 0,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "invalid limit above maximum",
    data: {
      page: undefined,
      limit: 1001,
    },
    expectedIssues: ["Too big: expected number to be <=1000"],
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
  links: {},
};

const successDataWithNextPage: GetRecommendationViewsResponse = {
  ...successData,
  links: {
    next: "https://api.vantage.sh/v2/recommendation_views?page=3&limit=10",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with default pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        page: undefined,
        limit: undefined,
      });
      expect(res).toEqual({
        recommendation_views: successData.recommendation_views,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with custom pagination",
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
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with next page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: {
          page: 2,
          limit: 10,
        },
        method: "GET",
        result: {
          ok: true,
          data: successDataWithNextPage,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        page: 2,
        limit: 10,
      });
      expect(res).toEqual({
        recommendation_views: successData.recommendation_views,
        pagination: {
          hasNextPage: true,
          nextPage: 3,
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
