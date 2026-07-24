import type { GetReportNotificationsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./list-report-notifications";
import { DEFAULT_LIMIT } from "./structure/constants";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData: GetReportNotificationsResponse = {
  report_notifications: [
    {
      token: "rprt_ntfctn_123",
      title: "Weekly Spend Summary",
      cost_report_token: "rprt_123",
      user_tokens: ["usr_123"],
      recipient_channels: ["#finance"],
      frequency: "weekly",
      change: "percentage",
    },
  ],
  links: {
    next: "https://api.vantage.sh/v2/report_notifications?page=2",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/report_notifications",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
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
        report_notifications: successData.report_notifications,
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
        endpoint: "/v2/report_notifications",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
