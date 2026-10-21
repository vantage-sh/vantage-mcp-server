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
  parent_folder_token: undefined,
  saved_filter_tokens: undefined,
  workspace_token: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "My Folder",
  type: "CostFolder",
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
    name: "cost report folder",
    data: minimalValidInputArguments,
  },
  {
    name: "provider resource folder",
    data: validInputArguments,
  },
  {
    name: "folder type is required",
    data: {
      ...undefineds,
      title: "My Folder",
    } as any,
    expectedIssues: ['Invalid option: expected one of "CostFolder"|"DashboardFolder"|"ProviderResourceFolder"'],
  },
  {
    name: "invalid folder type",
    data: {
      ...minimalValidInputArguments,
      type: "UnknownFolder" as any,
    },
    expectedIssues: ['Invalid option: expected one of "CostFolder"|"DashboardFolder"|"ProviderResourceFolder"'],
  },
  {
    name: "empty title",
    data: {
      ...undefineds,
      title: "",
      type: "CostFolder",
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

const dashboardFolderArgs: InferValidators<Validators> = {
  ...minimalValidInputArguments,
  title: "Executive Dashboards",
  type: "DashboardFolder",
  parent_folder_token: "fldr_parent",
};
const dashboardFolderResponse = {
  ...successData,
  title: "Executive Dashboards",
  type: "DashboardFolder",
  parent_folder_token: "fldr_parent",
  saved_filter_tokens: [],
};

argumentSchemaTests.push({ name: "nested Dashboard Folder", data: dashboardFolderArgs });
executionTests.push(
  {
    name: "creates a nested Dashboard Folder with an inherited Workspace",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/folders",
        params: dashboardFolderArgs,
        method: "POST",
        result: { ok: true, data: dashboardFolderResponse },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(dashboardFolderArgs)).toEqual(dashboardFolderResponse);
    },
  },
  {
    name: "surfaces an inaccessible parent Folder",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/folders",
        params: dashboardFolderArgs,
        method: "POST",
        result: { ok: false, errors: [{ message: "Folder fldr_parent not found." }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(dashboardFolderArgs);
      expect(error.exception).toEqual({ errors: [{ message: "Folder fldr_parent not found." }] });
    },
  }
);

testTool(tool, argumentSchemaTests, executionTests);
