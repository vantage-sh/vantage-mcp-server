import { type GetRecommendationResourceResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/recommendations/get-recommendation-resource-details";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  recommendation_token: "rec_123",
  resource_token: "res_456",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "blank string recommendation_token",
    data: {
      recommendation_token: "",
      resource_token: "res_456",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "blank string resource_token",
    data: {
      recommendation_token: "rec_123",
      resource_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
];

const successData: GetRecommendationResourceResponse = {
  token: "res_456",
  uuid: "i-1234567890abcdef0",
  type: "aws_instance",
  label: "i-1234567890abcdef0",
  metadata: null,
  account_id: "123456789012",
  billing_account_id: "123456789012",
  provider: "aws",
  region: "us-east-1",
  created_at: "2023-01-15T10:30:00Z",
  tags: {},
  resource_id: "i-1234567890abcdef0",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources/${pathEncode("res_456")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources/${pathEncode("res_456")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Resource not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Resource not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
