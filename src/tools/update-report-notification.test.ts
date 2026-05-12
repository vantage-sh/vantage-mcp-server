import { pathEncode, type UpdateReportNotificationResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./update-report-notification";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  cost_report_token: undefined,
  user_tokens: undefined,
  recipient_channels: undefined,
  frequency: undefined,
  change: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  report_notification_token: "rprt_ntfctn_123",
};

const validArguments: InferValidators<Validators> = {
  report_notification_token: "rprt_ntfctn_123",
  title: "Updated Spend Summary",
  cost_report_token: "rprt_456",
  user_tokens: ["usr_123", "usr_456"],
  recipient_channels: ["#finance"],
  frequency: "monthly",
  change: "dollars",
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
    name: "empty title",
    data: {
      ...validArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
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
    name: "invalid change",
    data: {
      ...validArguments,
      change: "absolute" as any,
    },
    expectedIssues: ['Invalid option: expected one of "percentage"|"dollars"'],
  },
];

const successData: UpdateReportNotificationResponse = {
  token: "rprt_ntfctn_123",
  title: "Updated Spend Summary",
  cost_report_token: "rprt_456",
  user_tokens: ["usr_123", "usr_456"],
  recipient_channels: ["#finance"],
  frequency: "monthly",
  change: "dollars",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/report_notifications/${pathEncode("rprt_ntfctn_123")}`,
        params: {
          title: "Updated Spend Summary",
          cost_report_token: "rprt_456",
          user_tokens: ["usr_123", "usr_456"],
          recipient_channels: ["#finance"],
          frequency: "monthly",
          change: "dollars",
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
        endpoint: `/v2/report_notifications/${pathEncode("rprt_ntfctn_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Report notification not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Report notification not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
