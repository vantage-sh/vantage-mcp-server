import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../utils/testing";
import tool from "./get-dashboard";

const success = {
  token: "dshbrd_fb27faa25ef5ea72",
  title: "My Dashboard",
  workspace_token: "wrkspc_e5c550d14cfa3101",
  widgets: [],
  saved_filter_tokens: [],
  date_bin: "day" as const,
  date_interval: "this_month" as const,
  created_at: "2024-07-03T00:00:00Z",
  updated_at: "2024-07-03T00:00:00Z",
};

testTool(
  tool,
  [
    {
      name: "takes dashboard_token",
      data: {
        dashboard_token: "dshbrd_fb27faa25ef5ea72",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboards/${pathEncode("dshbrd_fb27faa25ef5ea72")}`,
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
          dashboard_token: "dshbrd_fb27faa25ef5ea72",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboards/${pathEncode("dshbrd_nonexistent")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Dashboard not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          dashboard_token: "dshbrd_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Dashboard not found" }],
        });
      },
    },
  ]
);
