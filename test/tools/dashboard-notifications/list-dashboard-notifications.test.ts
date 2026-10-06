import type { GetDashboardNotificationsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboard-notifications/list-dashboard-notifications";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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

const validArguments: InferValidators<Validators> = {
  page: 1,
  q: "Weekly Executive",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
      q: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData: GetDashboardNotificationsResponse = {
  dashboard_notifications: [
    {
      token: "rprtbl_ntfctn_123",
      title: "Weekly Executive Dashboard",
      dashboard_token: "dshbrd_123",
      user_tokens: ["usr_123"],
      recipient_emails: ["finance@example.com"],
      frequency: "weekly",
    },
  ],
  links: {
    next: "https://api.vantage.sh/v2/dashboard_notifications?page=2",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboard_notifications",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Weekly Executive",
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        dashboard_notifications: successData.dashboard_notifications,
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboard_notifications",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Weekly Executive",
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Unable to list dashboard notifications" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Unable to list dashboard notifications" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
