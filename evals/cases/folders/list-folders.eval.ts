import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-folders";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "folders",
    distractors: ["list-dashboards", "list-cost-reports", "get-folder", "list-resource-reports"],
    directPrompts: [
      {
        input:
          "Use list-folders to find DashboardFolder folders with Finance in the title in workspace wrkspc_123, page 1.",
        expected: [
          {
            toolName: TARGET,
            input: {
              type: "DashboardFolder",
              q: "Finance",
              workspace_token: "wrkspc_123",
              page: 1,
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show page 2 of the folders used to organize dashboards in Vantage workspace wrkspc_123.",
        expected: [
          {
            toolName: TARGET,
            input: {
              type: "DashboardFolder",
              workspace_token: "wrkspc_123",
              page: 2,
            },
          },
        ],
      },
    ],
  });
}
