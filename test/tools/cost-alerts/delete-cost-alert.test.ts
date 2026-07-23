import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../../src/utils/testing";
import tool from "../../../src/tools/cost-alerts/delete-cost-alert";

testTool(
  tool,
  [
    {
      name: "takes cost_alert_token",
      data: {
        cost_alert_token: "cstm_alrt_rl_123",
      },
    },
    {
      name: "rejects empty cost_alert_token",
      data: {
        cost_alert_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          cost_alert_token: "cstm_alrt_rl_123",
        });
        expect(res).toEqual({ token: "cstm_alrt_rl_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_missing")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Cost alert not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          cost_alert_token: "cstm_alrt_rl_missing",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Cost alert not found" }],
        });
      },
    },
  ]
);
