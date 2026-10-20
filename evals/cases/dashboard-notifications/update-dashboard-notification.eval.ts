import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-dashboard-notification";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboard-notifications",
    distractors: [
      "update-report-notification",
      "update-dashboard",
      "create-dashboard-notification",
      "update-cost-alert",
    ],
    directPrompts: [
      {
        input:
          "Use update-dashboard-notification to rename rprtbl_ntfctn_executive to Daily executive email, set its frequency to daily, and set its Vantage recipients to user usr_finance.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_executive",
              title: "Daily executive email",
              frequency: "daily",
              user_tokens: ["usr_finance"],
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Change my existing Vantage dashboard email schedule rprtbl_ntfctn_finance to send dashboard dshbrd_forecast monthly. Keep its current title and recipients.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_notification_token: "rprtbl_ntfctn_finance",
              dashboard_token: "dshbrd_forecast",
              frequency: "monthly",
            },
          },
        ],
      },
    ],
  });
}
