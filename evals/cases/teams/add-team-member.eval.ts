import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "add-team-member";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["remove-team-member", "get-team-members", "update-team", "get-user"],
    directPrompts: [
      {
        input: "Use add-team-member to add pat@example.com to Vantage Team team_abc123 as an integration owner.",
        expected: [
          {
            toolName: TARGET,
            input: {
              team_token: "team_abc123",
              user_email: "pat@example.com",
              role: "integration_owner",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "Make lee@example.com a viewer on the Vantage Team team_abc123.",
        expected: [
          {
            toolName: TARGET,
            input: { team_token: "team_abc123", user_email: "lee@example.com", role: "viewer" },
          },
        ],
      },
    ],
  });
}
