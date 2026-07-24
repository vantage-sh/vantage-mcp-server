import { type GetReportNotificationResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./get-report-notification";

const success: GetReportNotificationResponse = {
  token: "rprt_ntfctn_123",
  title: "Weekly Spend Summary",
  cost_report_token: "rprt_123",
  user_tokens: ["usr_123"],
  recipient_channels: ["#finance"],
  frequency: "weekly",
  change: "percentage",
};

testTool(
  tool,
  [
    {
      name: "takes report_notification_token",
      data: {
        report_notification_token: "rprt_ntfctn_123",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_notifications/${pathEncode("rprt_ntfctn_123")}`,
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
          report_notification_token: "rprt_ntfctn_123",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_notifications/${pathEncode("rprt_ntfctn_nonexistent")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Report notification not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          report_notification_token: "rprt_ntfctn_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Report notification not found" }],
        });
      },
    },
  ]
);
