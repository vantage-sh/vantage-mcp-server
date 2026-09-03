import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "remove-team-member";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["add-team-member", "get-team-members", "delete-team", "update-team"],
    directPrompts: [
      {
        input: "Use remove-team-member to remove user usr_def456 from Vantage Team team_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { team_token: "team_abc123", user_token: "usr_def456" },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Take user usr_legacy789 off the Vantage Team team_abc123 without deleting the user.",
        expected: [
          {
            toolName: TARGET,
            input: { team_token: "team_abc123", user_token: "usr_legacy789" },
          },
        ],
      },
    ],
  });
}
