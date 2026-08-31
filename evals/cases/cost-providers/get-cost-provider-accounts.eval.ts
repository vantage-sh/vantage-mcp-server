import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-cost-provider-accounts";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "cost-providers",
    distractors: ["list-cost-providers", "list-cost-integrations", "list-costs", "list-provider-resources"],
    directPrompts: [
      {
        input: "Use get-cost-provider-accounts to list the AWS accounts in workspace wrkspc_abc123.",
        expected: [{ toolName: TARGET, input: { workspace_token: "wrkspc_abc123", provider: "aws" } }],
      },
    ],
    inferredPrompts: [
      {
        input:
          "I need human-readable titles for all connected billing accounts in workspace wrkspc_abc123 so I can use their account IDs in a VQL filter.",
        expected: [{ toolName: TARGET, input: { workspace_token: "wrkspc_abc123" } }],
      },
      {
        input: "In workspace wrkspc_abc123, search connected billing accounts for titles matching McpTest.",
        expected: [{ toolName: TARGET, input: { workspace_token: "wrkspc_abc123", q: "McpTest" } }],
      },
    ],
  });
}
