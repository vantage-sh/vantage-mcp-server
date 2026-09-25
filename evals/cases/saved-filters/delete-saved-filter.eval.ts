import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-saved-filter";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "saved-filters",
    distractors: ["get-saved-filter", "update-saved-filter", "delete-cost-report"],
    directPrompts: [
      {
        input: "Use delete-saved-filter to delete svd_fltr_abc123.",
        expected: [{ toolName: TARGET, input: { saved_filter_token: "svd_fltr_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Remove obsolete Vantage Cost Report filter svd_fltr_old456 permanently.",
        expected: [{ toolName: TARGET, input: { saved_filter_token: "svd_fltr_old456" } }],
      },
    ],
  });
}
