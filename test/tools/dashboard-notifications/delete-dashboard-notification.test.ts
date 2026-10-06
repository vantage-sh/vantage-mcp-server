import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboard-notifications/delete-dashboard-notification";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

testTool(
  tool,
  [
    {
      name: "takes dashboard_notification_token",
      data: {
        dashboard_notification_token: "rprtbl_ntfctn_123",
      },
    },
    {
      name: "rejects a report notification token",
      data: {
        dashboard_notification_token: "rprt_ntfctn_123",
      },
      expectedIssues: ["Must be a Dashboard Notification token (rprtbl_ntfctn_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboard_notifications/${pathEncode("rprtbl_ntfctn_123")}`,
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
          dashboard_notification_token: "rprtbl_ntfctn_123",
        });
        expect(res).toEqual({ token: "rprtbl_ntfctn_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboard_notifications/${pathEncode("rprtbl_ntfctn_missing")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Dashboard notification not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          dashboard_notification_token: "rprtbl_ntfctn_missing",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Dashboard notification not found" }],
        });
      },
    },
  ]
);
