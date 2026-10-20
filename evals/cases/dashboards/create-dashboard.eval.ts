import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-dashboard";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["create-folder", "update-dashboard", "create-dashboard-notification", "create-cost-report"],
    directPrompts: [
      {
        input:
          "Use create-dashboard to create a dashboard titled Weekly Spend inside Dashboard Folder fldr_finance, inheriting its workspace. Leave it empty.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Weekly Spend",
              folder_token: "fldr_finance",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Add an empty Vantage dashboard named Executive Overview to Dashboard Folder fldr_executive in workspace wrkspc_123.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Executive Overview",
              folder_token: "fldr_executive",
              workspace_token: "wrkspc_123",
            },
          },
        ],
      },
    ],
  });
}
