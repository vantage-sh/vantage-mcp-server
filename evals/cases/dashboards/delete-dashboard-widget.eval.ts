import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-dashboard-widget";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["delete-dashboard", "update-dashboard", "delete-folder", "delete-dashboard-notification"],
    directPrompts: [
      {
        input: "Use delete-dashboard-widget to delete widget dshbrd_wdgt_unused.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_unused",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Remove only widget dshbrd_wdgt_old from my Vantage dashboard. Keep the dashboard and all its other widgets.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_old",
            },
          },
        ],
      },
    ],
  });
}
