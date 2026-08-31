import { type GetCostProviderAccountsResponse, VANTAGE_PROVIDERS } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/cost-providers/get-cost-provider-accounts";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "just workspace_token",
    data: {
      workspace_token: "wrkspc_123",
      account_id: undefined,
      account_name: undefined,
      provider: undefined,
      q: undefined,
    },
  },
  {
    name: "account_id provided",
    data: {
      workspace_token: "wrkspc_123",
      account_id: "acct_123",
      account_name: undefined,
      provider: undefined,
      q: undefined,
    },
  },
  {
    name: "provider provided",
    data: {
      workspace_token: "wrkspc_123",
      account_id: undefined,
      account_name: undefined,
      provider: "aws",
      q: undefined,
    },
  },
  {
    name: "q provided",
    data: {
      workspace_token: "wrkspc_123",
      account_id: undefined,
      account_name: undefined,
      provider: undefined,
      q: "prod",
    },
  },
  {
    name: "account_name provided",
    data: {
      workspace_token: "wrkspc_123",
      account_id: undefined,
      account_name: "Production Account",
      provider: undefined,
      q: undefined,
    },
  },
  {
    name: "invalid provider rejected",
    data: {
      workspace_token: "wrkspc_123",
      account_id: undefined,
      account_name: undefined,
      // @ts-expect-error intentionally invalid provider for schema validation
      provider: "not-a-provider",
      q: undefined,
    },
    expectedIssues: [`Invalid option: expected one of ${VANTAGE_PROVIDERS.map((p) => `"${p}"`).join("|")}`],
  },
  {
    name: "all arguments provided",
    data: {
      workspace_token: "wrkspc_123",
      account_id: "acct_123",
      account_name: "Production Account",
      provider: "aws",
      q: "prod",
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

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call without filters",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wrkspc_123",
          account_id: undefined,
          account_name: undefined,
          provider: undefined,
          q: undefined,
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
        workspace_token: "wrkspc_123",
        account_id: undefined,
        account_name: undefined,
        provider: undefined,
        q: undefined,
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
          workspace_token: "wrkspc_123",
          account_id: "acct_123",
          account_name: undefined,
          provider: undefined,
          q: undefined,
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
        workspace_token: "wrkspc_123",
        account_id: "acct_123",
        account_name: undefined,
        provider: undefined,
        q: undefined,
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
          workspace_token: "wrkspc_123",
          account_id: undefined,
          account_name: undefined,
          provider: "aws",
          q: undefined,
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
        workspace_token: "wrkspc_123",
        account_id: undefined,
        account_name: undefined,
        provider: "aws",
        q: undefined,
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
    name: "successful call with q search",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wrkspc_123",
          account_id: undefined,
          account_name: undefined,
          provider: undefined,
          q: "prod",
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
        workspace_token: "wrkspc_123",
        account_id: undefined,
        account_name: undefined,
        provider: undefined,
        q: "prod",
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
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_provider_accounts",
        params: {
          workspace_token: "wrkspc_123",
          account_id: undefined,
          account_name: undefined,
          provider: undefined,
          q: undefined,
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
        workspace_token: "wrkspc_123",
        account_id: undefined,
        account_name: undefined,
        provider: undefined,
        q: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Invalid token" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
