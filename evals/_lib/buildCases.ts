import type { TestCase } from "promptfoo";
import type { ToolCallRecord } from "./assertToolCalls";

export type PromptCase = {
  input: string;
  expected: ToolCallRecord[];
};

export type ToolEvalDefinition = {
  target: string;
  /** Resource folder under `src/tools/<resource>/`, mirrored in cases and results. */
  resource: string;
  directPrompts: PromptCase[];
  inferredPrompts: PromptCase[];
};

export function buildToolCases(definition: ToolEvalDefinition): TestCase[] {
  const suites = [
    { phrasing: "direct", prompts: definition.directPrompts },
    { phrasing: "inferred", prompts: definition.inferredPrompts },
  ] as const;

  return suites.flatMap(({ phrasing, prompts }) =>
    prompts.map((prompt) => ({
      description: `${definition.target} · ${phrasing} · ${prompt.input}`,
      vars: {
        prompt: prompt.input,
        target: definition.target,
        expected: prompt.expected,
      },
      metadata: {
        tool: definition.target,
        resource: definition.resource,
        phrasing,
      },
      assert: [
        {
          type: "javascript",
          value: "file://_lib/assertToolCalls.ts",
        },
      ],
    }))
  );
}
