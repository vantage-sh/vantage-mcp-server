import type { CreateDashboardNotificationResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboard-notifications/create-dashboard-notification";
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
  workspace_token: undefined,
  user_tokens: undefined,
  recipient_emails: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "Weekly Executive Dashboard",
  dashboard_token: "dshbrd_123",
  frequency: "weekly",
};

const validArguments: InferValidators<Validators> = {
  title: "Weekly Executive Dashboard",
  dashboard_token: "dshbrd_123",
  workspace_token: "wrkspc_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  frequency: "weekly",
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
    name: "invalid recipient email",
    data: {
      ...validArguments,
      recipient_emails: ["not-an-email"],
    },
    expectedIssues: ["Invalid email address"],
  },
  {
    name: "rejects a dashboard widget token",
    data: {
      ...validArguments,
      dashboard_token: "dshbrd_wdgt_123",
    },
    expectedIssues: ["Must be a Dashboard token (dshbrd_*)"],
  },
];

const successData: CreateDashboardNotificationResponse = {
  token: "rprtbl_ntfctn_123",
  title: "Weekly Executive Dashboard",
  dashboard_token: "dshbrd_123",
  user_tokens: ["usr_123"],
  recipient_emails: ["finance@example.com"],
  frequency: "weekly",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboard_notifications",
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
        endpoint: "/v2/dashboard_notifications",
        params: {
          title: "Missing Dashboard",
          dashboard_token: "dshbrd_missing",
          frequency: "daily",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Dashboard not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        title: "Missing Dashboard",
        dashboard_token: "dshbrd_missing",
        frequency: "daily",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Dashboard not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
