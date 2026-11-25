import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-ranked-business-metric-values";
const token = "bsnss_mtrc_3080a050c04104ff";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "business-metrics",
    distractors: [
      "get-business-metric-values",
      "list-business-metric-labels",
      "get-business-metric",
      "get-business-metric-forecasted-values",
    ],
    directPrompts: [
      {
        input: `Use get-ranked-business-metric-values for ${token} to get the top 10 labels from 2026-01-15 through 2026-03-31.`,
        expected: [
          {
            toolName: TARGET,
            input: { business_metric_token: token, start_date: "2026-01-15", end_date: "2026-03-31", top_labels: 10 },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: `My usage metric ${token} is labeled by customer. From March 1 through November 24, 2026, which 50 customers used the most overall? I need their monthly usage and each month's total across all customers to calculate their shares.`,
        expected: [
          {
            toolName: TARGET,
            input: { business_metric_token: token, start_date: "2026-03-01", end_date: "2026-11-24", top_labels: 50 },
          },
        ],
      },
    ],
  });
}
