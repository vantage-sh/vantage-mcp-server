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
import { dashboardResponse } from "./fixtures";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  q: "AWS Cost",
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
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
      ...dashboardResponse,
      token: "dash_123",
      title: "AWS Cost Dashboard",
      widgets: dashboardResponse.widgets,
      saved_filter_tokens: [],
      date_bin: "day" as const,
      date_interval: "custom" as const,
      created_at: "2023-01-15T10:30:00Z",
      updated_at: "2023-01-15T10:30:00Z",
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
      workspace_token: "wrkspc_123",
    },
  ],
  links: {},
};

const outputSchemaTests: SchemaTestTableItem<OutputSchema>[] = [
  {
    name: "Dashboard list with another page",
    data: { dashboards: successData.dashboards, pagination: { hasNextPage: true, nextPage: 2 } },
  },
  {
    name: "empty Dashboard list with no next page",
    data: { dashboards: [], pagination: { hasNextPage: false, nextPage: 0 } },
  },
  {
    name: "missing required pagination",
    data: { dashboards: [], pagination: undefined as any },
    expectedIssues: ["Invalid input: expected object, received undefined"],
  },
  {
    name: "invalid pagination flag",
    data: { dashboards: [], pagination: { hasNextPage: "true" as any, nextPage: 2 } },
    expectedIssues: ["Invalid input: expected boolean, received string"],
  },
];

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
    name: "successful call with another page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboards",
        params: { ...validArguments, limit: 64 },
        method: "GET",
        result: {
          ok: true,
          data: { ...successData, links: { next: "https://api.vantage.sh/v2/dashboards?page=2" } },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({ dashboards: successData.dashboards, pagination: { hasNextPage: true, nextPage: 2 } });
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

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
