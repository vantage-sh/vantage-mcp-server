import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-custom-calculation";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "custom-calculations",
    distractors: ["list-custom-calculations", "update-custom-calculation", "get-cost-report", "query-costs"],
    directPrompts: [
      {
        input: "Use get-custom-calculation to read cstm_clcltn_123.",
        expected: [{ toolName: TARGET, input: { custom_calculation_token: "cstm_clcltn_123" } }],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Show me the saved definition, read-only status, and visible report attachment tokens for KPI cstm_clcltn_456.",
        expected: [{ toolName: TARGET, input: { custom_calculation_token: "cstm_clcltn_456" } }],
      },
    ],
  });
}
