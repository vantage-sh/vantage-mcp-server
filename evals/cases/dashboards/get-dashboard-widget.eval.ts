import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-dashboard-widget";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["get-dashboard", "update-dashboard-widget", "get-cost-report", "get-dashboard-notification"],
    directPrompts: [
      {
        input: "Use get-dashboard-widget to retrieve widget dshbrd_wdgt_spend.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_spend",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show the title, linked report, and display settings of Vantage dashboard widget dshbrd_wdgt_compute.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_compute",
            },
          },
        ],
      },
    ],
  });
}
