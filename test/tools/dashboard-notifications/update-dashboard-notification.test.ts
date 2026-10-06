import { pathEncode, type UpdateDashboardNotificationResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboard-notifications/update-dashboard-notification";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  dashboard_token: undefined,
  user_tokens: undefined,
  recipient_emails: undefined,
  frequency: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  dashboard_notification_token: "rprtbl_ntfctn_123",
};

const validArguments: InferValidators<Validators> = {
  dashboard_notification_token: "rprtbl_ntfctn_123",
  title: "Renamed Dashboard Notification",
  dashboard_token: "dshbrd_456",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  frequency: "monthly",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidArguments,
  },
  {
    name: "all valid arguments",
    data: validArguments,
  },
  {
    name: "invalid frequency",
    data: {
      ...validArguments,
      frequency: "hourly" as any,
    },
    expectedIssues: ['Invalid option: expected one of "daily"|"weekly"|"monthly"'],
  },
  {
    name: "rejects a report notification token",
    data: {
      ...minimalValidArguments,
      dashboard_notification_token: "rprt_ntfctn_123",
    },
    expectedIssues: ["Must be a Dashboard Notification token (rprtbl_ntfctn_*)"],
  },
];

const successData: UpdateDashboardNotificationResponse = {
  token: "rprtbl_ntfctn_123",
  title: "Renamed Dashboard Notification",
  dashboard_token: "dshbrd_456",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  frequency: "monthly",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/dashboard_notifications/${pathEncode("rprtbl_ntfctn_123")}`,
        params: {
          title: "Renamed Dashboard Notification",
          dashboard_token: "dshbrd_456",
          user_tokens: ["usr_123"],
          recipient_emails: ["finance@example.com"],
          frequency: "monthly",
        },
        method: "PUT",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/dashboard_notifications/${pathEncode("rprtbl_ntfctn_123")}`,
        params: {
          title: "Renamed Dashboard Notification",
        },
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Dashboard notification not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        dashboard_notification_token: "rprtbl_ntfctn_123",
        title: "Renamed Dashboard Notification",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Dashboard notification not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
