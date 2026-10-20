import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/list-dashboards";
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
  folder_token: undefined,
  page: 1,
  q: "AWS Cost",
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      folder_token: undefined,
      page: undefined,
      q: undefined,
      workspace_token: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData = {
  dashboards: [
    {
      token: "dash_123",
      title: "AWS Cost Dashboard",
      widgets: [],
      saved_filter_tokens: [],
      date_bin: "day" as const,
      date_interval: "this_month" as const,
      created_at: "2023-01-15T10:30:00Z",
      updated_at: "2023-01-15T10:30:00Z",
      folder_token: null,
      workspace_token: "wrkspc_123",
    },
    {
      token: "dash_456",
      title: "Azure Monitoring Dashboard",
      widgets: [],
      saved_filter_tokens: [],
      date_bin: "day" as const,
      date_interval: "this_month" as const,
      created_at: "2023-01-15T10:30:00Z",
      updated_at: "2023-01-15T10:30:00Z",
      folder_token: "fldr_dashboard",
      workspace_token: "wrkspc_123",
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboards",
        params: {
          page: 1,
          limit: 64,
          q: "AWS Cost",
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
        dashboards: successData.dashboards,
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
        endpoint: "/v2/dashboards",
        params: {
          page: 1,
          limit: 64,
          q: "AWS Cost",
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

argumentSchemaTests.push(
  { name: "Dashboard Folder filter", data: { ...validArguments, folder_token: "fldr_dashboard" } },
  {
    name: "rejects a non-folder filter token",
    data: { ...validArguments, folder_token: "dshbrd_123" },
    expectedIssues: ["Must be a Folder token (fldr_*)"],
  }
);

for (const folder_token of ["fldr_dashboard", "fldr_missing", "fldr_cost"]) {
  const args = { ...validArguments, q: "Azure", folder_token };
  const dashboards = folder_token === "fldr_dashboard" ? [successData.dashboards[1]] : [];
  executionTests.push({
    name: `filters by ${folder_token} with title and Workspace`,
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboards",
        params: { ...args, limit: 64 },
        method: "GET",
        result: { ok: true, data: { dashboards, links: {} } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(args)).toEqual({
        dashboards,
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  });
}

testTool(tool, argumentSchemaTests, executionTests);
