import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/delete-kubernetes-efficiency-report";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

testTool(
  tool,
  [
    {
      name: "accepts a report token",
      data: { kubernetes_efficiency_report_token: "kbnts_eff_rprt_123" },
    },
    {
      name: "rejects an empty report token",
      data: { kubernetes_efficiency_report_token: "" },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call encodes and returns the report token",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_unsafe/123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(
          await callExpectingSuccess({
            kubernetes_efficiency_report_token: "kbnts_eff_rprt_unsafe/123",
          })
        ).toEqual({ token: "kbnts_eff_rprt_unsafe/123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_missing")}`,
          params: {},
          method: "DELETE",
          result: { ok: false, errors: [{ message: "Kubernetes Efficiency Report not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({
          kubernetes_efficiency_report_token: "kbnts_eff_rprt_missing",
        });
        expect(error.exception).toEqual({
          errors: [{ message: "Kubernetes Efficiency Report not found" }],
        });
      },
    },
  ]
);
