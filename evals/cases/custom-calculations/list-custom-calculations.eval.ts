import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-custom-calculations";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "custom-calculations",
    distractors: ["get-custom-calculation", "list-cost-reports", "list-business-metrics", "list-budgets"],
    directPrompts: [
      {
        input: "Use list-custom-calculations to show page 2 of the KPIs I can access.",
        expected: [{ toolName: TARGET, input: { page: 2 } }],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Show the first page of reusable KPI calculations available in my Vantage account, including built-in read-only ones.",
        expected: [{ toolName: TARGET, input: { page: 1 } }],
      },
    ],
  });
}
