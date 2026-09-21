import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-kubernetes-efficiency-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "get-kubernetes-efficiency-report",
      "update-kubernetes-efficiency-report",
      "delete-cost-report",
      "list-kubernetes-efficiency-reports",
    ],
    directPrompts: [
      {
        input: "Use delete-kubernetes-efficiency-report to permanently delete report kbnts_eff_rprt_abc123.",
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
        input: "Remove the obsolete Vantage Kubernetes efficiency report kbnts_eff_rprt_legacy456 for good.",
        expected: [
          {
            toolName: TARGET,
            input: { kubernetes_efficiency_report_token: "kbnts_eff_rprt_legacy456" },
          },
        ],
      },
    ],
  });
}
