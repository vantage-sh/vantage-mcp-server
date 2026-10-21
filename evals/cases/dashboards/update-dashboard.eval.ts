import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "update-dashboard";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "dashboards",
    distractors: ["update-folder", "update-dashboard-widget", "create-dashboard", "delete-dashboard-widget"],
    directPrompts: [
      {
        input:
          "Use update-dashboard to move dashboard dshbrd_finance into Dashboard Folder fldr_executive. Keep its widgets.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_finance",
              folder_token: "fldr_executive",
            },
          },
        ],
      },
    ],
    inferredPrompts: [
      {
        input:
          "Move Vantage dashboard dshbrd_finance to root using a null folder and replace its entire widget list with one free-text widget titled Notes saying Weekly context. Place it at x=0, y=0, width 12, height 2. Its workspace is wrkspc_123.",
        expected: [
          {
            toolName: TARGET,
            input: {
              dashboard_token: "dshbrd_finance",
              folder_token: null,
              workspace_token: "wrkspc_123",
              widgets: [
                {
                  widgetable_type: "free_text",
                  title: "Notes",
                  content: {
                    type: "doc",
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: "Weekly context",
                          },
                        ],
                      },
                    ],
                  },
                  settings: {
                    display_type: "chart",
                    grid: {
                      x: 0,
                      y: 0,
                      w: 12,
                      h: 2,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}
