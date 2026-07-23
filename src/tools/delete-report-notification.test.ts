import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./delete-report-notification";
import { requestsInOrder, testTool } from "../utils/testing";

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
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          report_notification_token: "rprt_ntfctn_123",
        });
        expect(res).toEqual({ token: "rprt_ntfctn_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_notifications/${pathEncode("rprt_ntfctn_nonexistent")}`,
          params: {},
          method: "DELETE",
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
