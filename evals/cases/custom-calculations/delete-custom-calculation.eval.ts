import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-custom-calculation";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "custom-calculations",
    distractors: ["update-custom-calculation", "delete-cost-report", "delete-budget", "get-custom-calculation"],
    directPrompts: [
      {
        input: "Use delete-custom-calculation to delete the editable KPI cstm_clcltn_123.",
        expected: [{ toolName: TARGET, input: { custom_calculation_token: "cstm_clcltn_123" } }],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Permanently remove the editable KPI calculation cstm_clcltn_456 from Vantage and every report where it is attached. Keep the reports themselves.",
        expected: [{ toolName: TARGET, input: { custom_calculation_token: "cstm_clcltn_456" } }],
      },
    ],
  });
}
