import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-folder";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "folders",
    distractors: ["update-dashboard", "create-folder", "update-cost-report", "get-folder"],
    directPrompts: [
      {
        input: "Use update-folder to nest Dashboard Folder fldr_executive under fldr_parent.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_executive",
              parent_folder_token: "fldr_parent",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Move dashboard folder fldr_executive to the root in Vantage. Send a null parent and keep its title.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_executive",
              parent_folder_token: null,
            },
          },
        ],
      },
    ],
  });
}
