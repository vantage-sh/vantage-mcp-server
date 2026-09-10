import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-financial-commitment-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: [
      "create-financial-commitment-report",
      "query-financial-commitment-report-costs",
      "get-financial-commitment-report",
      "update-cost-report",
    ],
    directPrompts: [
      {
        input:
          "Use update-financial-commitment-report to rename fncl_cmnt_rprt_abc123 to Account Commitment Coverage and group it by resource_account_id and service.",
        expected: [
          {
            toolName: TARGET,
            input: {
              financial_commitment_report_token: "fncl_cmnt_rprt_abc123",
              title: "Account Commitment Coverage",
              groupings: ["resource_account_id", "service"],
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Change Vantage financial commitment report fncl_cmnt_rprt_abc123 so its breakdown shows the commitment billing account alongside the cost type.",
        expected: [
          {
            toolName: TARGET,
            input: {
              financial_commitment_report_token: "fncl_cmnt_rprt_abc123",
              groupings: ["provider_account_id", "cost_type"],
            },
          },
        ],
      },
    ],
  });
}
