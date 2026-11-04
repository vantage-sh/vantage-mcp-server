import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-custom-calculation";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "custom-calculations",
    distractors: ["create-custom-calculation", "update-cost-report", "update-budget", "get-custom-calculation"],
    directPrompts: [
      {
        input:
          "Use update-custom-calculation to rename cstm_clcltn_123 to AWS spend. Send cost_report_tokens as JSON null to leave its report attachments unchanged.",
        expected: [
          {
            toolName: TARGET,
            input: { custom_calculation_token: "cstm_clcltn_123", title: "AWS spend", cost_report_tokens: null },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "For the built-in read-only KPI cstm_clcltn_456, replace its complete set of report attachments with rprt_123 and rprt_456. Leave its calculation definition unchanged.",
        expected: [
          {
            toolName: TARGET,
            input: { custom_calculation_token: "cstm_clcltn_456", cost_report_tokens: ["rprt_123", "rprt_456"] },
          },
        ],
      },
    ],
  });
}
