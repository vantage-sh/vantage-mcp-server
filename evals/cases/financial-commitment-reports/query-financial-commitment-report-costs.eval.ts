import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "query-financial-commitment-report-costs";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: ["get-financial-commitment-report", "list-financial-commitment-reports", "list-costs", "query-costs"],
    directPrompts: [
      {
        input:
          "Use query-financial-commitment-report-costs to fetch cost data for financial commitment report fncl_cmnt_rprt_abc123 from 2024-03-01 through 2024-03-31, grouped by resource_account_id and service.",
        expected: [
          {
            toolName: TARGET,
            input: {
              financial_commitment_report_token: "fncl_cmnt_rprt_abc123",
              start_date: "2024-03-01",
              end_date: "2024-03-31",
              groupings: ["resource_account_id", "service"],
              page: 1,
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "For Vantage financial commitment report fncl_cmnt_rprt_abc123, show me which linked accounts' resources are actually consuming the commitments, broken down by resource account and commitment type. Use the report's saved date range and filters.",
        expected: [
          {
            toolName: TARGET,
            input: {
              financial_commitment_report_token: "fncl_cmnt_rprt_abc123",
              groupings: ["resource_account_id", "commitment_type"],
              page: 1,
            },
          },
        ],
      },
    ],
  });
}
