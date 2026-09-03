import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-team";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "teams",
    distractors: ["create-team", "get-team", "add-team-member", "update-workspace"],
    directPrompts: [
      {
        input: "Use update-team to rename team_abc123 to Platform Engineering and clear its default Dashboard.",
        expected: [
          {
            toolName: TARGET,
            input: {
              team_token: "team_abc123",
              name: "Platform Engineering",
              default_dashboard_token: null,
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input: "The Vantage Team team_abc123 should now be called Cloud Efficiency.",
        expected: [{ toolName: TARGET, input: { team_token: "team_abc123", name: "Cloud Efficiency" } }],
      },
    ],
  });
}
