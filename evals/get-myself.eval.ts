import { evalite } from "evalite";
import { toolCallAccuracy } from "evalite/scorers";
import { pickTools } from "./_lib/distractors";
import { runToolSelection } from "./_lib/runToolSelection";
import { TOOL_EVAL_VARIANTS } from "./_lib/variants";

const TARGET = "get-myself";

const directPrompts = [
  { input: "Call get-myself", expected: [{ toolName: TARGET, input: {} }] },
  { input: "Get the current user.", expected: [{ toolName: TARGET, input: {} }] },
  { input: "What workspaces do I have access to?", expected: [{ toolName: TARGET, input: {} }] },
  { input: "Show my Vantage account info.", expected: [{ toolName: TARGET, input: {} }] },
];

const inferredPrompts = [
  { input: "Before I run a cost query I need to know my default workspace token.", expected: [{ toolName: TARGET, input: {} }] },
  { input: "What's my account info on this MCP connection?", expected: [{ toolName: TARGET, input: {} }] },
  { input: "Figure out which Vantage workspaces I can see.", expected: [{ toolName: TARGET, input: {} }] },
  { input: "I want to know which org my token belongs to.", expected: [{ toolName: TARGET, input: {} }] },
];

evalite.each(TOOL_EVAL_VARIANTS)("get-myself · direct phrasing", {
  data: () => directPrompts,
  task: (prompt, variant) =>
    runToolSelection({
      prompt,
      model: variant.model,
      toolNames: pickTools(TARGET, variant.mode),
    }),
  scorers: [
    ({ output, expected }) =>
      toolCallAccuracy({
        actualCalls: output.toolCalls,
        expectedCalls: expected ?? [],
        mode: "flexible",
      }),
  ],
});

evalite.each(TOOL_EVAL_VARIANTS)("get-myself · inferred phrasing", {
  data: () => inferredPrompts,
  task: (prompt, variant) =>
    runToolSelection({
      prompt,
      model: variant.model,
      toolNames: pickTools(TARGET, variant.mode),
    }),
  scorers: [
    ({ output, expected }) =>
      toolCallAccuracy({
        actualCalls: output.toolCalls,
        expectedCalls: expected ?? [],
        mode: "flexible",
      }),
  ],
});
