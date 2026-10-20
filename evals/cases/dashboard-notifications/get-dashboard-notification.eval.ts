import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-dashboard-notification";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboard-notifications",
    distractors: ["get-report-notification", "get-dashboard", "list-dashboard-notifications", "get-budget-alert"],
    directPrompts: [
      {
        input: "Use get-dashboard-notification to retrieve rprtbl_ntfctn_weekly.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_weekly",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Show the recipients, frequency, and linked dashboard for my Vantage dashboard email schedule rprtbl_ntfctn_executive.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_executive",
            },
          },
        ],
      },
    ],
  });
}
