import type { GetCostAlertsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/cost-alerts/list-cost-alerts";
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

const noArguments: InferValidators<Validators> = {
  page: undefined,
  limit: undefined,
  q: undefined,
  workspace_token: undefined,
};

const validArguments: InferValidators<Validators> = {
  page: 2,
  limit: 5000,
  q: "production",
  workspace_token: "wrkspc_123",
};

const defaultRequestArguments = {
  page: 1,
  limit: DEFAULT_LIMIT,
  q: undefined,
  workspace_token: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "no filters",
    data: noArguments,
  },
  {
    name: "search and workspace filters",
    data: validArguments,
  },
  {
    name: "limit above API maximum",
    data: {
      ...validArguments,
      limit: 5001,
    },
    expectedIssues: ["Too big: expected number to be <=5000"],
  },
  {
    name: "non-workspace token",
    data: {
      ...validArguments,
      workspace_token: "rprt_123",
    },
    expectedIssues: ["Must be a Workspace token (wrkspc_*)"],
  },
];

function makeCostAlert(token: string) {
  return {
    token,
    title: `Cost Alert ${token}`,
    threshold: 100,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    email_recipients: ["user@example.com"],
    slack_channels: ["#alerts"],
    teams_channels: ["General"],
    minimum_threshold: 50,
    workspace_token: "wrkspc_123",
    interval: "day",
    unit_type: "currency",
    report_tokens: ["rprt_123"],
  };
}

const successData: GetCostAlertsResponse = {
  cost_alerts: [makeCostAlert("cstm_alrt_rl_123"), makeCostAlert("cstm_alrt_rl_456")],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with filters and pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_alerts",
        params: validArguments,
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
        cost_alerts: successData.cost_alerts,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with pagination defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_alerts",
        params: defaultRequestArguments,
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            links: {
              next: "https://api.vantage.sh/v2/cost_alerts?page=2",
            },
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(noArguments);
      expect(res).toEqual({
        cost_alerts: successData.cost_alerts,
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_alerts",
        params: validArguments,
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
