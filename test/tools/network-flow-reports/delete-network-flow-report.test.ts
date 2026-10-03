import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/network-flow-reports/delete-network-flow-report";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const validOutput = { token: "ntflw_lg_rprt_unsafe/123" };

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
      name: "accepts a report token",
      data: { network_flow_report_token: "ntflw_lg_rprt_123" },
    },
    {
      name: "rejects an empty report token",
      data: { network_flow_report_token: "" },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call encodes and returns the report token",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg_rprt_unsafe/123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({
          network_flow_report_token: "ntflw_lg_rprt_unsafe/123",
        });
        expect(result).toEqual({ token: "ntflw_lg_rprt_unsafe/123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg_rprt_missing")}`,
          params: {},
          method: "DELETE",
          result: { ok: false, errors: [{ message: "Network Flow Report not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({
          network_flow_report_token: "ntflw_lg_rprt_missing",
        });
        expect(error.exception).toEqual({ errors: [{ message: "Network Flow Report not found" }] });
      },
    },
  ]
);
