import { type GetDashboardNotificationResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboard-notifications/get-dashboard-notification";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const success: GetDashboardNotificationResponse = {
  token: "rprtbl_ntfctn_123",
  title: "Weekly Executive Dashboard",
  dashboard_token: "dshbrd_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  frequency: "weekly",
};

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
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({ dashboard_notification_token: "rprtbl_ntfctn_123" });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/dashboard_notifications/${pathEncode("rprtbl_ntfctn_missing")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Dashboard notification not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({ dashboard_notification_token: "rprtbl_ntfctn_missing" });
        expect(err.exception).toEqual({
          errors: [{ message: "Dashboard notification not found" }],
        });
      },
    },
  ]
);
