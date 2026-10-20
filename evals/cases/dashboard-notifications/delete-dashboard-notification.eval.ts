import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-dashboard-notification";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboard-notifications",
    distractors: [
      "delete-report-notification",
      "delete-dashboard",
      "update-dashboard-notification",
      "delete-cost-alert",
    ],
    directPrompts: [
      {
        input: "Use delete-dashboard-notification to remove schedule rprtbl_ntfctn_unused.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_unused",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Stop the scheduled Vantage dashboard emails from rprtbl_ntfctn_finance by removing that notification. Keep the dashboard itself.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_finance",
            },
          },
        ],
      },
    ],
  });
}
