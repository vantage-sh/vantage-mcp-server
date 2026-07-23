import { pathEncode, type UpdateRecommendationViewResponse } from "@vantage-sh/vantage-client";
import { expect, test } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import tool from "../../../src/tools/recommendation-views/update-recommendation-view";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  provider_ids: undefined,
  billing_account_ids: undefined,
  account_ids: undefined,
  regions: undefined,
  tag_key: undefined,
  tag_value: undefined,
  start_date: undefined,
  end_date: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  recommendation_view_token: "rec_vw_123",
};

const validInputArguments: InferValidators<Validators> = {
  recommendation_view_token: "rec_vw_123",
  title: "Production Recommendations",
  provider_ids: ["aws"],
  billing_account_ids: ["123456789012"],
  account_ids: ["acct_123"],
  regions: ["us-east-1"],
  tag_key: "environment",
  tag_value: "production",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidInputArguments,
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "invalid provider ids",
    data: {
      ...minimalValidInputArguments,
      provider_ids: "aws" as unknown as string[],
    },
    expectedIssues: ["Invalid input: expected array, received string"],
  },
  {
    name: "invalid billing account ids",
    data: {
      ...minimalValidInputArguments,
      billing_account_ids: "123456789012" as unknown as string[],
    },
    expectedIssues: ["Invalid input: expected array, received string"],
  },
  {
    name: "invalid account ids",
    data: {
      ...minimalValidInputArguments,
      account_ids: "acct_123" as unknown as string[],
    },
    expectedIssues: ["Invalid input: expected array, received string"],
  },
  {
    name: "invalid regions",
    data: {
      ...minimalValidInputArguments,
      regions: "us-east-1" as unknown as string[],
    },
    expectedIssues: ["Invalid input: expected array, received string"],
  },
  {
    name: "empty recommendation view token",
    data: {
      ...minimalValidInputArguments,
      recommendation_view_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty title",
    data: {
      ...minimalValidInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty provider id",
    data: {
      ...minimalValidInputArguments,
      provider_ids: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty billing account id",
    data: {
      ...minimalValidInputArguments,
      billing_account_ids: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty account id",
    data: {
      ...minimalValidInputArguments,
      account_ids: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty region",
    data: {
      ...minimalValidInputArguments,
      regions: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty tag filters",
    data: {
      ...minimalValidInputArguments,
      tag_key: "",
      tag_value: "",
    },
    expectedIssues: [
      "Too small: expected string to have >=1 characters",
      "Too small: expected string to have >=1 characters",
    ],
  },
  {
    name: "invalid start date",
    data: {
      ...minimalValidInputArguments,
      start_date: "not-a-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "invalid end date",
    data: {
      ...minimalValidInputArguments,
      end_date: "not-a-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
];

const successData: UpdateRecommendationViewResponse = {
  token: "rec_vw_123",
  title: "Production Recommendations",
  workspace_token: "wrkspc_123",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  provider_ids: ["aws"],
  billing_account_ids: ["123456789012"],
  account_ids: ["acct_123"],
  regions: ["us-east-1"],
  tag_key: "environment",
  tag_value: "production",
  created_at: "2024-07-15T16:08:54Z",
  created_by: "team_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendation_views/${pathEncode("rec_vw_123")}`,
        params: {
          title: "Production Recommendations",
          provider_ids: ["aws"],
          billing_account_ids: ["123456789012"],
          account_ids: ["acct_123"],
          regions: ["us-east-1"],
          tag_key: "environment",
          tag_value: "production",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
        },
        method: "PUT",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validInputArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/recommendation_views/${pathEncode("rec_vw_missing")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Recommendation view not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        recommendation_view_token: "rec_vw_missing",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Recommendation view not found" }],
      });
    },
  },
  {
    name: "tag key without tag value",
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        tag_key: "environment",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "tag_key and tag_value must both be provided together" }],
      });
    },
  },
  {
    name: "tag value without tag key",
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        tag_value: "production",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "tag_key and tag_value must both be provided together" }],
      });
    },
  },
  {
    name: "start date without end date",
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        start_date: "2024-01-01",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "end date without start date",
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        end_date: "2024-12-31",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
];

test("update-recommendation-view is marked destructive", () => {
  expect(tool.annotations.destructive).toBe(true);
});

testTool(tool, argumentSchemaTests, executionTests);
