import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/delete-dashboard-widget";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

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
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ widget_token: "dshbrd_wdgt_123" });
        expect(res).toEqual({ token: "dshbrd_wdgt_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/widgets/${pathEncode("dshbrd_wdgt_missing")}`,
          params: {},
          method: "DELETE",
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
