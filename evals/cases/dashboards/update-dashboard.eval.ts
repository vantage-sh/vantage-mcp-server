import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-dashboard";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["update-folder", "update-dashboard-widget", "create-dashboard", "delete-dashboard-widget"],
    directPrompts: [
      {
        input:
          "Use update-dashboard to move dashboard dshbrd_finance into Dashboard Folder fldr_executive. Keep its widgets.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_finance",
              folder_token: "fldr_executive",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Move Vantage dashboard dshbrd_finance out of its folder to the root. Send a null folder and leave its widgets and title alone.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_finance",
              folder_token: null,
            },
          },
        ],
      },
    ],
  });
}
