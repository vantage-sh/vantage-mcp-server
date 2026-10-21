import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-dashboard-notifications";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboard-notifications",
    distractors: ["list-report-notifications", "list-dashboards", "list-cost-alerts", "list-budget-alerts"],
    directPrompts: [
      {
        input: "Use list-dashboard-notifications to return page 2 of notifications with Finance in their title.",
        expected: [
          {
            toolName: TARGET,
            input: {
              page: 2,
              q: "Finance",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Show page 1 of my scheduled Vantage dashboard emails whose names contain Executive.",
        expected: [
          {
            toolName: TARGET,
            input: {
              page: 1,
              q: "Executive",
            },
          },
        ],
      },
    ],
  });
}
