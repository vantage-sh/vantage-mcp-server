import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "list-saved-filters";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "saved-filters",
    distractors: ["get-saved-filter", "list-cost-reports", "list-recommendation-views"],
    directPrompts: [
      {
        input: "Use list-saved-filters to search page 2 for saved filters titled AWS in workspace wrkspc_abc123.",
        expected: [{ toolName: TARGET, input: { page: 2, q: "AWS", workspace_token: "wrkspc_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Show me the first page of reusable Cost Report filters in Vantage for workspace wrkspc_abc123.",
        expected: [{ toolName: TARGET, input: { page: 1, workspace_token: "wrkspc_abc123" } }],
      },
    ],
  });
}
