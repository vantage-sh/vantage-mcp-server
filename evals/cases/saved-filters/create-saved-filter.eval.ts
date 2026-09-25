import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-saved-filter";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "saved-filters",
    distractors: ["update-saved-filter", "create-cost-report", "create-recommendation-view"],
    directPrompts: [
      {
        input:
          "Use create-saved-filter to create AWS Spend in workspace wrkspc_abc123 with VQL filter (costs.provider = 'aws').",
        expected: [
          {
            toolName: TARGET,
            input: { title: "AWS Spend", workspace_token: "wrkspc_abc123", filter: "(costs.provider = 'aws')" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Save a reusable Vantage Cost Report filter named Azure Spend in workspace wrkspc_abc123 using VQL (costs.provider = 'azure').",
        expected: [
          {
            toolName: TARGET,
            input: { title: "Azure Spend", workspace_token: "wrkspc_abc123", filter: "(costs.provider = 'azure')" },
          },
        ],
      },
    ],
  });
}
