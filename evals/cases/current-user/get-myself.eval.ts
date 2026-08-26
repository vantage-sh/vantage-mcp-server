import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "get-myself";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "current-user",
    directPrompts: [
      {
        input: "Use get-myself to inspect the current Vantage credentials.",
        expected: [{ toolName: TARGET, input: {} }],
      },
    ],
    inferredPrompts: [
      {
        input: "What is my default workspace?",
        expected: [{ toolName: TARGET, input: {} }],
      },
    ],
  });
}
