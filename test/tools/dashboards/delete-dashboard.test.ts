import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/delete-dashboard";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

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
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          dashboard_token: "dshbrd_fb27faa25ef5ea72",
        });
        expect(res).toEqual({ token: "dshbrd_fb27faa25ef5ea72" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboards/${pathEncode("dshbrd_nonexistent")}`,
          params: {},
          method: "DELETE",
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
