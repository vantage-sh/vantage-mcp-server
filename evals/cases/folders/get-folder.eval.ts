import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-folder";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "folders",
    distractors: ["get-dashboard", "list-folders", "update-folder", "get-resource-report"],
    directPrompts: [
      {
        input: "Use get-folder to retrieve Dashboard Folder fldr_executive.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_executive",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show the details and parent of my Vantage dashboard folder fldr_executive.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_executive",
            },
          },
        ],
      },
    ],
  });
}
