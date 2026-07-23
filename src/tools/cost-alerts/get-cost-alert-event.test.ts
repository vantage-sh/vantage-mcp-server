import { type GetCostAlertEventResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../utils/testing";
import tool from "./get-cost-alert-event";

const success: GetCostAlertEventResponse = {
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

testTool(
  tool,
  [
    {
      name: "takes cost_alert_token and event_token",
      data: {
        cost_alert_token: "cstm_alrt_rl_123",
        event_token: "cstm_alrt_evnt_123",
      },
    },
    {
      name: "rejects empty cost_alert_token",
      data: {
        cost_alert_token: "",
        event_token: "cstm_alrt_evnt_123",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
    {
      name: "rejects empty event_token",
      data: {
        cost_alert_token: "cstm_alrt_rl_123",
        event_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}/events/${pathEncode("cstm_alrt_evnt_123")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          cost_alert_token: "cstm_alrt_rl_123",
          event_token: "cstm_alrt_evnt_123",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}/events/${pathEncode("cstm_alrt_evnt_missing")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Cost alert event not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          cost_alert_token: "cstm_alrt_rl_123",
          event_token: "cstm_alrt_evnt_missing",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Cost alert event not found" }],
        });
      },
    },
  ]
);
