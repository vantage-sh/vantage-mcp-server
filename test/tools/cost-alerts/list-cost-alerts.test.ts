import type { GetCostAlertsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/cost-alerts/list-cost-alerts";
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
  q: "production",
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "no filters",
    data: {
      q: undefined,
      workspace_token: undefined,
    },
  },
  {
    name: "search and workspace filters",
    data: validArguments,
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
    name: "successful call",
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
