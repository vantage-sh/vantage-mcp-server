import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-dashboard";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["delete-dashboard-widget", "delete-folder", "delete-dashboard-notification", "update-dashboard"],
    directPrompts: [
      {
        input: "Use delete-dashboard to delete dashboard dshbrd_unused and its widgets.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_unused",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Remove the entire Vantage dashboard dshbrd_retired, including every widget it contains.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_retired",
            },
          },
        ],
      },
    ],
  });
}
