import type { GetMeResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/current-user/get-myself";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const workspace = {
  token: "wrkspc_123",
  name: "Workspace 1",
  created_at: "2023-01-01T00:00:00Z",
  enable_currency_conversion: true,
  currency: "USD",
  exchange_rate_date: "2023-01-01T00:00:00Z",
};

const successData = {
  default_workspace_token: "wrkspc_123",
  default_dashboard_token: "dshbrd_123",
  workspaces: [workspace],
  bearer_token: {
    created_at: "2023-01-01T00:00:00Z",
    scope: ["read"],
    description: "test",
  },
  is_account_owner: true,
} satisfies GetMeResponse;

const minimalSuccessData = {
  default_workspace_token: null,
  workspaces: [],
  bearer_token: successData.bearer_token,
  is_account_owner: false,
} satisfies GetMeResponse;

testTool(
  tool,
  [
    {
      name: "is blank",
      data: {},
    },
  ],
  [
    {
      name: "valid response",
      data: successData,
    },
    {
      name: "null default tokens and no accessible workspaces",
      data: {
        ...successData,
        default_workspace_token: null,
        default_dashboard_token: null,
        workspaces: [],
        is_account_owner: false,
      },
    },
    {
      name: "optional default Dashboard",
      data: { ...successData, default_dashboard_token: undefined },
    },
    {
      name: "missing required account owner flag",
      data: { ...successData, is_account_owner: undefined as any },
      expectedIssues: ["Invalid input: expected boolean, received undefined"],
    },
    {
      name: "invalid bearer token scope",
      data: { ...successData, bearer_token: { ...successData.bearer_token, scope: [123 as any] } },
      expectedIssues: ["Invalid input: expected string, received number"],
    },
    {
      name: "missing required Workspace currency",
      data: { ...successData, workspaces: [{ ...workspace, currency: undefined as any }] },
      expectedIssues: ["Invalid input: expected string, received undefined"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/me",
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: successData,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({});
        expect(res).toEqual(successData);
      },
    },
    {
      name: "successful call without a default Dashboard or Workspace",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/me",
          params: {},
          method: "GET",
          result: { ok: true, data: minimalSuccessData },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({});
        expect(res).toEqual(minimalSuccessData);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: "/v2/me",
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Invalid token" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({});
        expect(err.exception).toEqual({
          errors: [{ message: "Invalid token" }],
        });
      },
    },
  ]
);
