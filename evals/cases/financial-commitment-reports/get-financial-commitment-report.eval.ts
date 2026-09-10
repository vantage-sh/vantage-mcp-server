import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-financial-commitment-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: [
      "list-financial-commitment-reports",
      "query-financial-commitment-report-costs",
      "update-financial-commitment-report",
      "get-cost-report",
    ],
    directPrompts: [
      {
        input:
          "Use get-financial-commitment-report to retrieve the saved configuration for Vantage financial commitment report fncl_cmnt_rprt_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { financial_commitment_report_token: "fncl_cmnt_rprt_abc123" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Show me the title, date range, groupings, and filter configured on Vantage financial commitment report fncl_cmnt_rprt_coverage789.",
        expected: [
          {
            toolName: TARGET,
            input: { financial_commitment_report_token: "fncl_cmnt_rprt_coverage789" },
          },
        ],
      },
    ],
  });
}
