import { expect } from "vitest";
import tool from "./create-recommendation-view";
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

const undefineds = {
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
  title: "Production Recommendations",
  workspace_token: "wrkspc_123",
};

const validInputArguments: InferValidators<Validators> = {
  title: "Staging Recommendations",
  workspace_token: "wrkspc_123",
  provider_ids: ["aws", "gcp"],
  billing_account_ids: ["ba_123"],
  account_ids: ["123456789012"],
  regions: ["us-east-1", "us-west-2"],
  tag_key: "environment",
  tag_value: "staging",
  start_date: "2024-01-01",
  end_date: "2024-06-30",
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
    name: "provider_ids must be strings",
    data: {
      ...validInputArguments,
      provider_ids: ["aws", 123] as any,
    },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
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
  tag_key: "environment",
  tag_value: "staging",
  created_at: "2024-07-15T16:10:00Z",
  created_by: "usr_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/recommendation_views",
        params: validInputArguments,
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
        params: minimalValidInputArguments,
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
];

testTool(tool, argumentSchemaTests, executionTests);
