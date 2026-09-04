import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-teams";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["get-team", "get-team-members", "get-users", "list-workspaces"],
    directPrompts: [
      {
        input:
          "Use get-teams to search page 2 for Vantage Teams named Platform that can access workspace wrkspc_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { page: 2, q: "Platform", workspace_token: "wrkspc_abc123" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Which Vantage Teams can access workspace wrkspc_abc123? Show page 3.",
        expected: [{ toolName: TARGET, input: { page: 3, workspace_token: "wrkspc_abc123" } }],
      },
    ],
  });
}
