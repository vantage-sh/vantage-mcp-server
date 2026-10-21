import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "create-dashboard-notification";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboard-notifications",
    distractors: ["create-report-notification", "create-cost-alert", "create-budget-alert", "create-dashboard"],
    directPrompts: [
      {
        input:
          "Use create-dashboard-notification to create Weekly executive email for dashboard dshbrd_executive in workspace wrkspc_123, sent weekly to user usr_finance.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Weekly executive email",
              dashboard_token: "dshbrd_executive",
              workspace_token: "wrkspc_123",
              frequency: "weekly",
              user_tokens: ["usr_finance"],
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Schedule a monthly email of my Vantage dashboard dshbrd_finance in workspace wrkspc_123 to approved recipient finance@example.com. Name the schedule Monthly dashboard summary.",
        expected: [
          {
            toolName: TARGET,
            input: {
              title: "Monthly dashboard summary",
              dashboard_token: "dshbrd_finance",
              workspace_token: "wrkspc_123",
              frequency: "monthly",
              recipient_emails: ["finance@example.com"],
            },
          },
        ],
      },
    ],
  });
}
