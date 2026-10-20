import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-dashboards";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["list-folders", "get-dashboard", "list-cost-reports", "list-dashboard-notifications"],
    directPrompts: [
      {
        input:
          "Use list-dashboards to find dashboards with Spend in the title directly inside Dashboard Folder fldr_finance in workspace wrkspc_123, page 1.",
        expected: [
          {
            toolName: TARGET,
            input: { folder_token: "fldr_finance", q: "Spend", workspace_token: "wrkspc_123", page: 1 },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show page 1 of the Vantage dashboards directly inside folder fldr_executive, excluding its subfolders.",
        expected: [{ toolName: TARGET, input: { folder_token: "fldr_executive", page: 1 } }],
      },
    ],
  });
}
