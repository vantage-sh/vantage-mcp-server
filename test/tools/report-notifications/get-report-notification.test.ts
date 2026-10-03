import { type GetReportNotificationResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-notifications/get-report-notification";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const success: GetReportNotificationResponse = {
  token: "rprt_ntfctn_123",
  title: "Weekly Spend Summary",
  cost_report_token: "rprt_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  recipient_channels: ["#finance"],
  frequency: "weekly",
  change: "percentage",
};

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

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
  outputSchemaTests,
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
