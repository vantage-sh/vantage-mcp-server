import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-dashboard-widget";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["update-dashboard", "update-cost-report", "get-dashboard-widget", "create-dashboard"],
    directPrompts: [
      {
        input:
          "Use update-dashboard-widget to point widget dshbrd_wdgt_spend at report rprt_monthly, rename it Monthly spend, and set its display type to table.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_spend",
              widgetable_token: "rprt_monthly",
              title: "Monthly spend",
              settings: {
                display_type: "table",
              },
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Change only Cost Report widget dshbrd_wdgt_usage on my Vantage dashboard into a usage KPI showing the average GB value. Keep its linked report, title, and all other widgets unchanged.",
        expected: [
          {
            toolName: TARGET,
            input: {
              widget_token: "dshbrd_wdgt_usage",
              settings: {
                display_type: "kpi",
                kpi_calculation: "average",
                kpi_type: "usage",
                kpi_usage_unit: "GB",
              },
            },
          },
        ],
      },
    ],
  });
}
