import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "delete-team";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["remove-team-member", "get-team", "update-team", "create-team"],
    directPrompts: [
      {
        input: "Use delete-team to delete Vantage Team team_abc123.",
        expected: [{ toolName: TARGET, input: { team_token: "team_abc123" } }],
      },
    ],
    inferredPrompts: [
      {
        input: "Permanently remove the obsolete Vantage Team team_legacy456.",
        expected: [{ toolName: TARGET, input: { team_token: "team_legacy456" } }],
      },
    ],
  });
}
