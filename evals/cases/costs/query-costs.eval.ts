import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "query-costs";

const rankedJobs = {
  workspace_token: "wrkspc_123",
  filter: "(costs.provider = 'databricks' AND costs.service = 'jobs')",
  start_date: "2026-10-01",
  end_date: "2026-10-31",
  groupings: ["resource_id"],
  date_bin: "month",
  sort_column: "amount",
  sort_direction: "desc",
  page: 1,
};

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "costs",
    distractors: ["list-costs", "list-cost-reports", "list-cost-services", "get-cost-provider-accounts"],
    directPrompts: [
      {
        input:
          "Use query-costs in workspace wrkspc_123 to rank Databricks jobs by total cost from 2026-10-01 through 2026-10-31. Filter (costs.provider = 'databricks' AND costs.service = 'jobs'), group by resource_id, use date_bin month, sort_column amount, sort_direction desc, page 1.",
        expected: [{ toolName: TARGET, input: rankedJobs }],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Which Databricks jobs cost the most in Vantage workspace wrkspc_123 from 2026-10-01 through 2026-10-31? Filter (costs.provider = 'databricks' AND costs.service = 'jobs'), group by resource_id, and rank each job by its total for the month rather than day by day. Page 1.",
        expected: [{ toolName: TARGET, input: rankedJobs }],
      },
    ],
  });
}
