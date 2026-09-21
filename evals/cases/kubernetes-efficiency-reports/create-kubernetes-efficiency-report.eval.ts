import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-kubernetes-efficiency-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "update-kubernetes-efficiency-report",
      "query-kubernetes-efficiency-report-costs",
      "create-cost-report",
      "list-kubernetes-efficiency-reports",
    ],
    directPrompts: [
      {
        input:
          "Use create-kubernetes-efficiency-report to create Production K8s Efficiency in workspace wrkspc_abc123 for last month, grouped by cluster_id, namespace, and label:app, with costs aggregated by cost efficiency.",
        expected: [
          {
            toolName: TARGET,
            input: {
              workspace_token: "wrkspc_abc123",
              title: "Production K8s Efficiency",
              date_interval: "last_month",
              groupings: ["cluster_id", "namespace", "label:app"],
              aggregated_by: "cost_efficiency",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Set up a saved Vantage Kubernetes efficiency report named Namespace Idle Spend in workspace wrkspc_abc123. Use the last 30 days, show daily data, group by namespace, and rank it by idle cost.",
        expected: [
          {
            toolName: TARGET,
            input: {
              workspace_token: "wrkspc_abc123",
              title: "Namespace Idle Spend",
              date_interval: "last_30_days",
              date_bucket: "day",
              groupings: ["namespace"],
              aggregated_by: "idle_cost",
            },
          },
        ],
      },
    ],
  });
}
