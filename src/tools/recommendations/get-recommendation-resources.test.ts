import { type GetRecommendationResourcesResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../utils/testing";
import { DEFAULT_LIMIT } from "../structure/constants";
import tool from "./get-recommendation-resources";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  recommendation_token: "rec_123",
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "blank string recommendation_token",
    data: {
      recommendation_token: "",
      page: 1,
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
];

const successData: GetRecommendationResourcesResponse = {
  resources: [
    {
      token: "res_123",
      uuid: "i-1234567890abcdef0",
      type: "aws_instance",
      label: "i-1234567890abcdef0",
      metadata: { instance_type: "m5.large" },
      account_id: "123456789012",
      billing_account_id: "123456789012",
      provider: "aws",
      region: "us-east-1",
      created_at: "2023-01-15T10:30:00Z",
      tags: {},
      resource_id: "i-1234567890abcdef0",
    },
    {
      token: "res_456",
      uuid: "vol-1234567890abcdef0",
      type: "aws_volume",
      label: "vol-1234567890abcdef0",
      metadata: { volume_type: "gp2", size: 100 },
      account_id: "123456789012",
      billing_account_id: "123456789012",
      provider: "aws",
      region: "us-east-1",
      created_at: "2023-01-15T10:30:00Z",
      tags: {},
      resource_id: "vol-1234567890abcdef0",
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources`,
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
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        resources: successData.resources,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources`,
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Recommendation not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Recommendation not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
