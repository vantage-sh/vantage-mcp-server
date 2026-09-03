import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-team";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["update-team", "add-team-member", "create-workspace", "get-teams"],
    directPrompts: [
      {
        input:
          "Use create-team to create a Vantage Team named Platform Ops in workspace wrkspc_abc123 and give user usr_def456 the editor role.",
        expected: [
          {
            toolName: TARGET,
            input: {
              name: "Platform Ops",
              workspace_tokens: ["wrkspc_abc123"],
              user_tokens: ["usr_def456"],
              role: "editor",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Set up a new Vantage Team called FinOps Enablement.",
        expected: [{ toolName: TARGET, input: { name: "FinOps Enablement" } }],
      },
    ],
  });
}
