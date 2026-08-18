import { expect } from "vitest";
import tool from "../../../src/tools/folders/list-folders";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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
  page: 1,
  q: "Finance",
  workspace_token: "wrkspc_123",
  type: "ProviderResourceFolder",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
      q: undefined,
      workspace_token: undefined,
      type: undefined,
    },
  },
  {
    name: "provider resource folder filter",
    data: validArguments,
  },
  {
    name: "invalid folder type",
    data: {
      page: 1,
      q: undefined,
      workspace_token: undefined,
      type: "DashboardFolder" as any,
    },
    expectedIssues: ['Invalid option: expected one of "CostFolder"|"ProviderResourceFolder"'],
  },
];

const successData = {
  folders: [
    {
      token: "fldr_123",
      title: "Infrastructure Resources",
      type: "ProviderResourceFolder",
      parent_folder_token: undefined,
      saved_filter_tokens: [],
      workspace_token: "wrkspc_123",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "filters provider resource folders",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/folders",
        params: {
          page: 1,
          type: "ProviderResourceFolder",
          limit: DEFAULT_LIMIT,
          q: "Finance",
          workspace_token: "wrkspc_123",
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
        folders: successData.folders,
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
        endpoint: "/v2/folders",
        params: {
          page: 1,
          type: "ProviderResourceFolder",
          limit: DEFAULT_LIMIT,
          q: "Finance",
          workspace_token: "wrkspc_123",
        },
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
