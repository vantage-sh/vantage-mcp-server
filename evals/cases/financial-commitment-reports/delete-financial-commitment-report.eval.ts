import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-financial-commitment-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: [
      "get-financial-commitment-report",
      "update-financial-commitment-report",
      "delete-cost-report",
      "list-financial-commitment-reports",
    ],
    directPrompts: [
      {
        input:
          "Use delete-financial-commitment-report to permanently delete Vantage financial commitment report fncl_cmnt_rprt_abc123.",
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
        input: "Remove the obsolete Vantage financial commitment report fncl_cmnt_rprt_legacy456 for good.",
        expected: [
          {
            toolName: TARGET,
            input: { financial_commitment_report_token: "fncl_cmnt_rprt_legacy456" },
          },
        ],
      },
    ],
  });
}
