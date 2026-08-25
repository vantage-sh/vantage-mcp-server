import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-myself";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "current-user",
    directPrompts: [
      { input: "Call get-myself", expected: [{ toolName: TARGET, input: {} }] },
      { input: "Get the current user.", expected: [{ toolName: TARGET, input: {} }] },
      { input: "What workspaces do I have access to?", expected: [{ toolName: TARGET, input: {} }] },
      { input: "Show my Vantage account info.", expected: [{ toolName: TARGET, input: {} }] },
    ],
    inferredPrompts: [
      {
        input: "Before I run a cost query I need to know my default workspace token.",
        expected: [{ toolName: TARGET, input: {} }],
      },
      {
        input: "What's my account info on this MCP connection?",
        expected: [{ toolName: TARGET, input: {} }],
      },
      {
        input: "Figure out which Vantage workspaces I can see.",
        expected: [{ toolName: TARGET, input: {} }],
      },
      {
        input: "I want to know which org my token belongs to.",
        expected: [{ toolName: TARGET, input: {} }],
      },
    ],
  });
}
