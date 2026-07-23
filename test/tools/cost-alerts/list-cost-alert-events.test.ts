import { type GetCostAlertEventsResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
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
import tool from "../../../src/tools/cost-alerts/list-cost-alert-events";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  cost_alert_token: "cstm_alrt_rl_123",
  report_token: "rprt_123",
  page: 1,
  limit: DEFAULT_LIMIT,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default pagination",
    data: {
      cost_alert_token: "cstm_alrt_rl_123",
      report_token: undefined,
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "all valid arguments",
    data: validArguments,
  },
  {
    name: "rejects empty cost_alert_token",
    data: {
      ...validArguments,
      cost_alert_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const event = {
  token: "cstm_alrt_evnt_123",
  created_at: "2025-04-08T17:39:30Z",
  triggered_at: "2025-04-10T17:39:30Z",
  description: "Day over day costs increased by $500.0.",
  alert_type: "change_in_cost",
  metadata: {
    change_in_cost: "500.0",
  },
  report_token: "rprt_123",
  alert_token: "cstm_alrt_rl_123",
};

const successData: GetCostAlertEventsResponse = {
  cost_alert_events: [event],
  links: {
    next: "https://api.vantage.sh/v2/cost_alerts/cstm_alrt_rl_123/events?page=2",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}/events`,
        params: {
          report_token: "rprt_123",
          page: 1,
          limit: DEFAULT_LIMIT,
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
        cost_alert_events: [event],
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
        endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_missing")}/events`,
        params: {
          report_token: undefined,
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Cost alert not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        cost_alert_token: "cstm_alrt_rl_missing",
        report_token: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost alert not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
