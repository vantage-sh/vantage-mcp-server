import { type GetDashboardWidgetResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/get-dashboard-widget";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const success: GetDashboardWidgetResponse = {
  token: "dshbrd_wdgt_123",
  widgetable_token: "rprt_123",
  title: "Weekly Sales",
  settings: {
    display_type: "chart",
  },
};

testTool(
  tool,
  [
    {
      name: "takes widget_token",
      data: {
        widget_token: "dshbrd_wdgt_123",
      },
    },
    {
      name: "rejects a dashboard token",
      data: {
        widget_token: "dshbrd_123",
      },
      expectedIssues: ["Must be a Dashboard Widget token (dshbrd_wdgt_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/widgets/${pathEncode("dshbrd_wdgt_123")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ widget_token: "dshbrd_wdgt_123" });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/widgets/${pathEncode("dshbrd_wdgt_missing")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Widget not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({ widget_token: "dshbrd_wdgt_missing" });
        expect(err.exception).toEqual({
          errors: [{ message: "Widget not found" }],
        });
      },
    },
  ]
);
