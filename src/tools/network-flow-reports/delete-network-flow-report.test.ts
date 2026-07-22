import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./delete-network-flow-report";

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
  [
    {
      name: "successful call encodes and returns the report token",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg/rprt_123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const result = await callExpectingSuccess({
          network_flow_report_token: "ntflw_lg/rprt_123",
        });
        expect(result).toEqual({ token: "ntflw_lg/rprt_123" });
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
