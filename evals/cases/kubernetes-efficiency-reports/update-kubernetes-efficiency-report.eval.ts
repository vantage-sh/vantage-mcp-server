import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-kubernetes-efficiency-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "create-kubernetes-efficiency-report",
      "query-kubernetes-efficiency-report-costs",
      "get-kubernetes-efficiency-report",
      "update-cost-report",
    ],
    directPrompts: [
      {
        input:
          "Use update-kubernetes-efficiency-report to rename kbnts_eff_rprt_abc123 to Team Efficiency and group it by namespace and label:team.",
        expected: [
          {
            toolName: TARGET,
            input: {
              kubernetes_efficiency_report_token: "kbnts_eff_rprt_abc123",
              title: "Team Efficiency",
              groupings: ["namespace", "label:team"],
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Change Vantage Kubernetes efficiency report kbnts_eff_rprt_abc123 to use weekly buckets over the last 30 days and rank rows by idle cost.",
        expected: [
          {
            toolName: TARGET,
            input: {
              kubernetes_efficiency_report_token: "kbnts_eff_rprt_abc123",
              date_bucket: "week",
              date_interval: "last_30_days",
              aggregated_by: "idle_cost",
            },
          },
        ],
      },
    ],
  });
}
