import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-folder";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "folders",
    distractors: ["create-dashboard", "update-folder", "list-folders", "create-cost-report"],
    directPrompts: [
      {
        input: "Use create-folder to create a DashboardFolder titled Executive Dashboards under fldr_parent.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Executive Dashboards",
              type: "DashboardFolder",
              parent_folder_token: "fldr_parent",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Add a folder named Executive Dashboards for organizing dashboards in Vantage workspace wrkspc_123.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Executive Dashboards",
              type: "DashboardFolder",
              workspace_token: "wrkspc_123",
            },
          },
        ],
      },
    ],
  });
}
