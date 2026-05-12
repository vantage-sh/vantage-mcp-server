import type { CreateReportNotificationResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./create-report-notification";
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
  workspace_token: undefined,
  user_tokens: undefined,
  recipient_channels: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "Daily Spend Summary",
  cost_report_token: "rprt_123",
  frequency: "daily",
  change: "percentage",
};

const validArguments: InferValidators<Validators> = {
  title: "Weekly Spend Summary",
  cost_report_token: "rprt_123",
  workspace_token: "wrkspc_123",
  user_tokens: ["usr_123"],
  recipient_channels: ["#finance"],
  frequency: "weekly",
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

const successData: CreateReportNotificationResponse = {
  token: "rprt_ntfctn_123",
  title: "Weekly Spend Summary",
  cost_report_token: "rprt_123",
  user_tokens: ["usr_123"],
  recipient_channels: ["#finance"],
  frequency: "weekly",
  change: "dollars",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_notifications",
        params: validArguments,
        method: "POST",
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
        endpoint: "/v2/report_notifications",
        params: {
          title: "Invalid Report Notification",
          cost_report_token: "rprt_invalid",
          frequency: "daily",
          change: "percentage",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Cost report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        title: "Invalid Report Notification",
        cost_report_token: "rprt_invalid",
        frequency: "daily",
        change: "percentage",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
