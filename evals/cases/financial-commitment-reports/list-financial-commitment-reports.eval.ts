import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-financial-commitment-reports";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: [
      "get-financial-commitment-report",
      "query-financial-commitment-report-costs",
      "list-cost-reports",
      "list-workspaces",
    ],
    directPrompts: [
      {
        input:
          "Use list-financial-commitment-reports to search page 2 for Vantage financial commitment reports titled Savings Plans in workspace wrkspc_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { page: 2, q: "Savings Plans", workspace_token: "wrkspc_abc123" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Which saved Vantage financial commitment reports are available in workspace wrkspc_finops789? Show the first page.",
        expected: [
          {
            toolName: TARGET,
            input: { page: 1, workspace_token: "wrkspc_finops789" },
          },
        ],
      },
    ],
  });
}
