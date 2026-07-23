import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../utils/testing";
import tool from "./create-recommendation-view";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;
type CreateRecommendationViewRequest = RequestBodyForPathAndMethod<"/v2/recommendation_views", "POST">;

const undefineds = {
  provider_ids: undefined,
  billing_account_ids: undefined,
  account_ids: undefined,
  regions: undefined,
  types: undefined,
  tag_key: undefined,
  tag_value: undefined,
  start_date: undefined,
  end_date: undefined,
  min_savings: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "Production Recommendations",
  workspace_token: "wrkspc_123",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "Staging Recommendations",
  workspace_token: "wrkspc_123",
  provider_ids: ["aws", "gcp"],
  billing_account_ids: ["ba_123"],
  account_ids: ["123456789012"],
  regions: ["us-east-1", "us-west-2"],
  types: ["rightsizing", "unused_resource"],
  tag_key: "environment",
  tag_value: "staging",
  start_date: "2024-01-01",
  end_date: "2024-06-30",
  min_savings: 100,
};

const expectedValidInputArguments = validInputArguments as CreateRecommendationViewRequest;
const expectedMinimalValidInputArguments = minimalValidInputArguments as CreateRecommendationViewRequest;

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
    name: "provider_ids must be strings",
    data: {
      ...validInputArguments,
      provider_ids: ["aws", 123] as any,
    },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
  {
    name: "empty workspace token",
    data: {
      ...validInputArguments,
      workspace_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty recommendation type",
    data: {
      ...validInputArguments,
      types: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "negative minimum savings",
    data: {
      ...validInputArguments,
      min_savings: -1,
    },
    expectedIssues: ["Too small: expected number to be >=0"],
  },
  poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
];

const successData = {
  token: "rec_vw_123",
  title: "Staging Recommendations",
  workspace_token: "wrkspc_123",
  start_date: "2024-01-01",
  end_date: "2024-06-30",
  provider_ids: ["aws", "gcp"],
  billing_account_ids: ["ba_123"],
  account_ids: ["123456789012"],
  regions: ["us-east-1", "us-west-2"],
  types: ["rightsizing", "unused_resource"],
  tag_key: "environment",
  tag_value: "staging",
  min_savings: 100,
  created_at: "2024-07-15T16:10:00Z",
  created_by: "usr_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: expectedValidInputArguments,
        method: "POST",
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
        endpoint: "/v2/recommendation_views",
        params: expectedMinimalValidInputArguments,
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
  {
    name: "throws MCPUserError when only tag_key is provided",
    apiCallHandler: requestsInOrder([]),
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
    name: "throws MCPUserError when only tag_value is provided",
    apiCallHandler: requestsInOrder([]),
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
    name: "throws MCPUserError when only start_date is provided",
    apiCallHandler: requestsInOrder([]),
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
    name: "throws MCPUserError when only end_date is provided",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        end_date: "2024-06-30",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
