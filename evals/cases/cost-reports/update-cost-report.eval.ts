import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-cost-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "cost-reports",
    distractors: ["update-custom-calculation", "create-cost-report", "get-cost-report", "update-dashboard"],
    directPrompts: [
      {
        input:
          "Use update-cost-report to replace all KPI attachments on rprt_123 with cstm_clcltn_123 and cstm_clcltn_456, without changing any other report settings.",
        expected: [
          {
            toolName: TARGET,
            input: { cost_report_token: "rprt_123", custom_calculation_tokens: ["cstm_clcltn_123", "cstm_clcltn_456"] },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Remove every Custom Calculation KPI attachment from Cost Report rprt_456. Keep the report and the reusable KPI definitions.",
        expected: [{ toolName: TARGET, input: { cost_report_token: "rprt_456", custom_calculation_tokens: [] } }],
      },
    ],
  });
}
