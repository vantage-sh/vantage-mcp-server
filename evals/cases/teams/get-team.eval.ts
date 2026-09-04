import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-team";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["get-teams", "get-team-members", "update-team", "get-workspace"],
    directPrompts: [
      {
        input: "Use get-team to retrieve Vantage Team team_abc123.",
        expected: [{ toolName: TARGET, input: { token: "team_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Show me the details for the Vantage Team with token team_platform789.",
        expected: [{ toolName: TARGET, input: { token: "team_platform789" } }],
      },
    ],
  });
}
