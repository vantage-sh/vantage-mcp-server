import { type GetFolderResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/folders/update-folder";
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
  title: undefined,
  parent_folder_token: undefined,
  saved_filter_tokens: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  folder_token: "fldr_123",
};

const validInputArguments: InferValidators<Validators> = {
  folder_token: "fldr_123",
  title: "Updated Team Reports",
  parent_folder_token: "fldr_parent",
  saved_filter_tokens: ["svd_fltr_abc"],
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
];

const successData: GetFolderResponse = {
  token: "fldr_123",
  title: "Updated Team Reports",
  type: "CostFolder",
  parent_folder_token: "fldr_parent",
  saved_filter_tokens: ["svd_fltr_abc"],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-02T00:00:00Z",
  workspace_token: "wrkspc_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
        params: {
          title: "Updated Team Reports",
          parent_folder_token: "fldr_parent",
          saved_filter_tokens: ["svd_fltr_abc"],
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
        endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Folder not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Folder not found" }],
      });
    },
  },
];

for (const parent_folder_token of ["fldr_destination", null, "", undefined]) {
  const args = { ...minimalValidInputArguments, title: "Executive Dashboards", parent_folder_token };
  const response = {
    ...successData,
    title: "Executive Dashboards",
    type: "DashboardFolder",
    parent_folder_token: parent_folder_token === undefined ? "fldr_parent" : parent_folder_token || null,
    saved_filter_tokens: [],
  };
  argumentSchemaTests.push({ name: `parent ${String(parent_folder_token)}`, data: args });
  executionTests.push({
    name: `updates Dashboard Folder parent ${String(parent_folder_token)} without changing filters`,
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
        params: { title: "Executive Dashboards", parent_folder_token },
        method: "PUT",
        result: { ok: true, data: response },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(args)).toEqual(response);
    },
  });
}

for (const saved_filter_tokens of [null, []]) {
  const args = { ...minimalValidInputArguments, saved_filter_tokens };
  const response = { ...successData, saved_filter_tokens: [] };
  argumentSchemaTests.push({ name: `clears filters with ${JSON.stringify(saved_filter_tokens)}`, data: args });
  executionTests.push({
    name: `clears Cost Folder filters with ${JSON.stringify(saved_filter_tokens)}`,
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/folders/${pathEncode("fldr_123")}`,
        params: { saved_filter_tokens },
        method: "PUT",
        result: { ok: true, data: response },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(args)).toEqual(response);
    },
  });
}

argumentSchemaTests.push({
  name: "rejects a non-folder parent token",
  data: { ...minimalValidInputArguments, parent_folder_token: "dshbrd_123" },
  expectedIssues: ["Invalid input"],
});

testTool(tool, argumentSchemaTests, executionTests);
