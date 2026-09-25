import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-saved-filter";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "saved-filters",
    distractors: ["create-saved-filter", "get-saved-filter", "update-cost-report"],
    directPrompts: [
      {
        input:
          "Use update-saved-filter to rename svd_fltr_abc123 to Azure Spend and set its VQL filter to (costs.provider = 'azure').",
        expected: [
          {
            toolName: TARGET,
            input: {
              saved_filter_token: "svd_fltr_abc123",
              title: "Azure Spend",
              filter: "(costs.provider = 'azure')",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Change the Vantage Cost Report filter svd_fltr_abc123 so its saved VQL is (costs.provider = 'aws').",
        expected: [
          { toolName: TARGET, input: { saved_filter_token: "svd_fltr_abc123", filter: "(costs.provider = 'aws')" } },
        ],
      },
    ],
  });
}
