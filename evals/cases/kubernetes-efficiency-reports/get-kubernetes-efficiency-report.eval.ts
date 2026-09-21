import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-kubernetes-efficiency-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "list-kubernetes-efficiency-reports",
      "query-kubernetes-efficiency-report-costs",
      "update-kubernetes-efficiency-report",
      "get-cost-report",
    ],
    directPrompts: [
      {
        input: "Use get-kubernetes-efficiency-report to retrieve the saved configuration for kbnts_eff_rprt_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { kubernetes_efficiency_report_token: "kbnts_eff_rprt_abc123" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Show me the title, date range, groupings, aggregation metric, and VQL filter configured on Vantage Kubernetes efficiency report kbnts_eff_rprt_platform789.",
        expected: [
          {
            toolName: TARGET,
            input: { kubernetes_efficiency_report_token: "kbnts_eff_rprt_platform789" },
          },
        ],
      },
    ],
  });
}
