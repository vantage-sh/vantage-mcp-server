import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-team-members";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["get-team", "get-teams", "get-users", "add-team-member"],
    directPrompts: [
      {
        input: "Use get-team-members to show page 3 of the members of Vantage Team team_abc123.",
        expected: [{ toolName: TARGET, input: { team_token: "team_abc123", page: 3 } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Who belongs to Vantage Team team_abc123? Show me the second page.",
        expected: [{ toolName: TARGET, input: { team_token: "team_abc123", page: 2 } }],
      },
    ],
  });
}
