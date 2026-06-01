import type { GetCostProviderAccountsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-cost-provider-accounts";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  account_id: undefined,
  provider: undefined,
  account_name: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "just workspace_token",
    data: {
      workspace_token: "wt_123",
      ...undefineds,
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "account_id provided",
    data: {
      workspace_token: "wt_123",
      account_id: "acct_123",
      provider: undefined,
      account_name: undefined,
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "provider provided",
    data: {
      workspace_token: "wt_123",
      account_id: undefined,
      provider: "aws",
      account_name: undefined,
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "all arguments provided",
    data: {
      workspace_token: "wt_123",
      account_id: "acct_123",
      provider: "aws",
      account_name: undefined,
      page: 2,
      limit: 50,
    },
  },
];

const successData: GetCostProviderAccountsResponse = {
  cost_provider_accounts: [
    {
      account_id: "cpa_123",
      title: "Account 1",
      provider_uuid: "provider_uuid_1",
      provider: "aws",
    },
    {
      account_id: "cpa_456",
      title: "Account 2",
      provider_uuid: "provider_uuid_2",
      provider: "aws",
    },
  ],
};

const successDataWithNextPage: GetCostProviderAccountsResponse = {
  ...successData,
  links: {
    next: "https://api.vantage.sh/v2/cost_provider_accounts?page=3",
  },
};

// The API type for /v2/cost_provider_accounts doesn't include page/limit yet,
// but they are passed through via ...args at runtime. We cast params to satisfy
// the test framework's strict typing while matching actual runtime behavior.
const defaultPaginationParams = { page: 1, limit: DEFAULT_LIMIT } as Record<string, unknown>;

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call without filters",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wt_123",
          account_id: undefined,
          provider: undefined,
          account_name: undefined,
          ...defaultPaginationParams,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        workspace_token: "wt_123",
        account_id: undefined,
        provider: undefined,
        account_name: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(res).toEqual({
        cost_provider_accounts: successData.cost_provider_accounts,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with account_id filter",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wt_123",
          account_id: "acct_123",
          provider: undefined,
          account_name: undefined,
          ...defaultPaginationParams,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        workspace_token: "wt_123",
        account_id: "acct_123",
        provider: undefined,
        account_name: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(res).toEqual({
        cost_provider_accounts: successData.cost_provider_accounts,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with provider filter",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wt_123",
          account_id: undefined,
          provider: "aws",
          account_name: undefined,
          ...defaultPaginationParams,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        workspace_token: "wt_123",
        account_id: undefined,
        provider: "aws",
        account_name: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(res).toEqual({
        cost_provider_accounts: successData.cost_provider_accounts,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with pagination params and next page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wt_123",
          account_id: undefined,
          provider: undefined,
          account_name: undefined,
          ...({ page: 2, limit: 50 } as Record<string, unknown>),
        },
        method: "GET",
        result: {
          ok: true,
          data: successDataWithNextPage,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        workspace_token: "wt_123",
        account_id: undefined,
        provider: undefined,
        account_name: undefined,
        page: 2,
        limit: 50,
      });
      expect(res).toEqual({
        cost_provider_accounts: successDataWithNextPage.cost_provider_accounts,
        pagination: {
          hasNextPage: true,
          nextPage: 3,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wt_123",
          account_id: undefined,
          provider: undefined,
          account_name: undefined,
          ...defaultPaginationParams,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Invalid token" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        workspace_token: "wt_123",
        account_id: undefined,
        provider: undefined,
        account_name: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Invalid token" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
