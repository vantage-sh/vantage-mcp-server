import { expect } from "vitest";
import tool from "../../../src/tools/folders/create-folder";
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

const undefineds = {
  type: undefined,
  parent_folder_token: undefined,
  saved_filter_tokens: undefined,
  workspace_token: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "My Folder",
};

const validInputArguments: InferValidators<Validators> = {
  title: "Infrastructure Resources",
  type: "ProviderResourceFolder",
  parent_folder_token: "fldr_123",
  saved_filter_tokens: ["svd_fltr_abc", "svd_fltr_def"],
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidInputArguments,
  },
  {
    name: "provider resource folder",
    data: validInputArguments,
  },
  {
    name: "invalid folder type",
    data: {
      ...minimalValidInputArguments,
      type: "DashboardFolder" as any,
    },
    expectedIssues: ['Invalid option: expected one of "CostFolder"|"ProviderResourceFolder"'],
  },
  {
    name: "empty title",
    data: {
      ...undefineds,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData = {
  token: "fldr_789",
  title: "Infrastructure Resources",
  type: "ProviderResourceFolder",
  parent_folder_token: "fldr_123",
  saved_filter_tokens: ["svd_fltr_abc", "svd_fltr_def"],
  workspace_token: "wrkspc_123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "creates a provider resource folder",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/folders",
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
        endpoint: "/v2/folders",
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
