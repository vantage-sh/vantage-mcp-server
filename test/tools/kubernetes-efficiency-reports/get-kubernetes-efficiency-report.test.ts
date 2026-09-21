import { type GetKubernetesEfficiencyReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/get-kubernetes-efficiency-report";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const successData: GetKubernetesEfficiencyReportResponse = {
  token: "kbnts_eff_rprt_123",
  title: "Production Cluster Efficiency",
  default: false,
  created_at: "2026-09-01T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: null,
  start_date: null,
  end_date: null,
  date_interval: "last_month",
  date_bucket: "day",
  aggregated_by: "idle_cost",
  groupings: "cluster_id,namespace",
  filter: null,
};

testTool(
  tool,
  [
    {
      name: "accepts a report token",
      data: { kubernetes_efficiency_report_token: "kbnts_eff_rprt_123" },
    },
    {
      name: "rejects a token with the wrong prefix",
      data: { kubernetes_efficiency_report_token: "rprt_123" },
      expectedIssues: ["Must be a Kubernetes Efficiency Report token (kbnts_eff_rprt_*)"],
    },
  ],
  [
    {
      name: "successful call encodes the report token",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_unsafe/123")}`,
          params: {},
          method: "GET",
          result: { ok: true, data: successData },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(
          await callExpectingSuccess({
            kubernetes_efficiency_report_token: "kbnts_eff_rprt_unsafe/123",
          })
        ).toEqual(successData);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_missing")}`,
          params: {},
          method: "GET",
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
