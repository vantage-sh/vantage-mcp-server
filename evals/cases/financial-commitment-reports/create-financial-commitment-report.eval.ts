import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-financial-commitment-report";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "financial-commitment-reports",
    distractors: [
      "update-financial-commitment-report",
      "query-financial-commitment-report-costs",
      "create-cost-report",
      "list-financial-commitment-reports",
    ],
    directPrompts: [
      {
        input:
          "Use create-financial-commitment-report to create a report titled AWS Commitment Coverage in workspace wrkspc_abc123 for the last 30 days, grouped by resource_account_id and service.",
        expected: [
          {
            toolName: TARGET,
            input: {
              workspace_token: "wrkspc_abc123",
              title: "AWS Commitment Coverage",
              date_interval: "last_30_days",
              groupings: ["resource_account_id", "service"],
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Set up a new Vantage financial commitment report named Linked Account Savings Plan Coverage in workspace wrkspc_abc123. Use the last month and break it down by the account whose resources consumed the commitment and by commitment type.",
        expected: [
          {
            toolName: TARGET,
            input: {
              workspace_token: "wrkspc_abc123",
              title: "Linked Account Savings Plan Coverage",
              date_interval: "last_month",
              groupings: ["resource_account_id", "commitment_type"],
            },
          },
        ],
      },
    ],
  });
}
