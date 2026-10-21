import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-folder";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "folders",
    distractors: ["delete-dashboard", "delete-cost-report", "update-folder", "get-folder"],
    directPrompts: [
      {
        input: "Use delete-folder to delete the empty Dashboard Folder fldr_unused.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_unused",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Remove my folder fldr_old.",
        expected: [
          {
            toolName: TARGET,
            input: {
              folder_token: "fldr_old",
            },
          },
        ],
      },
    ],
  });
}
