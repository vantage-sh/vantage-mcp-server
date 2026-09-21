import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "query-kubernetes-efficiency-report-costs";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "get-kubernetes-efficiency-report",
      "list-kubernetes-efficiency-reports",
      "query-financial-commitment-report-costs",
      "query-costs",
    ],
    directPrompts: [
      {
        input:
          "Use query-kubernetes-efficiency-report-costs to fetch August 2026 costs for kbnts_eff_rprt_abc123, grouped by cluster_id, namespace, and label:app, on page 2.",
        expected: [
          {
            toolName: TARGET,
            input: {
              kubernetes_efficiency_report_token: "kbnts_eff_rprt_abc123",
              start_date: "2026-08-01",
              end_date: "2026-08-31",
              groupings: ["cluster_id", "namespace", "label:app"],
              page: 2,
              limit: 128,
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "For Vantage Kubernetes efficiency report kbnts_eff_rprt_abc123, show daily workload cost, idle cost, and efficiency by namespace and team label using the report's saved date range and filter. Show page 1.",
        expected: [
          {
            toolName: TARGET,
            input: {
              kubernetes_efficiency_report_token: "kbnts_eff_rprt_abc123",
              date_bin: "day",
              groupings: ["namespace", "label:team"],
              page: 1,
              limit: 128,
            },
          },
        ],
      },
    ],
  });
}
