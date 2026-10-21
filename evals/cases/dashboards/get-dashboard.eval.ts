import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-dashboard";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["get-dashboard-widget", "list-dashboards", "get-folder", "get-dashboard-notification"],
    directPrompts: [
      {
        input: "Use get-dashboard to retrieve dashboard dshbrd_finance.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_finance",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show the configuration and widgets of my Vantage dashboard dshbrd_executive.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_executive",
            },
          },
        ],
      },
    ],
  });
}
