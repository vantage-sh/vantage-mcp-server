import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-kubernetes-efficiency-reports";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "kubernetes-efficiency-reports",
    distractors: [
      "get-kubernetes-efficiency-report",
      "query-kubernetes-efficiency-report-costs",
      "list-cost-reports",
      "list-network-flow-reports",
    ],
    directPrompts: [
      {
        input:
          "Use list-kubernetes-efficiency-reports to search page 2 for reports titled Production in workspace wrkspc_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { q: "Production", workspace_token: "wrkspc_abc123", page: 2 },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Which saved Vantage Kubernetes efficiency reports are available in workspace wrkspc_platform789? Show the first page.",
        expected: [
          {
            toolName: TARGET,
            input: { workspace_token: "wrkspc_platform789", page: 1 },
          },
        ],
      },
    ],
  });
}
