import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-saved-filter";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "saved-filters",
    distractors: ["list-saved-filters", "get-cost-report", "get-recommendation-view"],
    directPrompts: [
      {
        input: "Use get-saved-filter to inspect svd_fltr_abc123.",
        expected: [{ toolName: TARGET, input: { saved_filter_token: "svd_fltr_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "What VQL query is stored in Vantage Cost Report filter svd_fltr_abc123?",
        expected: [{ toolName: TARGET, input: { saved_filter_token: "svd_fltr_abc123" } }],
      },
    ],
  });
}
