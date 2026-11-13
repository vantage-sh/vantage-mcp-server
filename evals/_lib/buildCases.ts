import type { TestCase } from "promptfoo";
import type { ApiFixture } from "./apiFixtures";
import type { CallCheck, ScenarioExpectation } from "./assertScenario";
import type { ToolCallRecord } from "./assertToolCalls";

export type PromptCase = {
  input: string;
  expected: [ToolCallRecord];
};

export type ToolEvalDefinition = {
  target: string;
  /** Resource folder under `src/tools/<resource>/`, mirrored in cases and results. */
  resource: string;
  /** Optional high-signal tools to include before sampling the remaining distractors. */
  distractors?: readonly string[];
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
        ...(definition.distractors ? { distractors: definition.distractors } : {}),
      },
      // Keep array vars (expected, distractors) intact. Without this, promptfoo
      // expands string arrays into a cartesian product of separate test cases.
      options: {
        disableVarExpansion: true,
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

export type ScenarioPrompt = {
  /** Short label for what the prompt exercises, stored as `metadata.scenario`. */
  scenario: string;
  input: string;
  /** Checks on the model's first call to the target. */
  checks: CallCheck[];
  /** Checked before the definition's fixtures, so a scenario can override a shared response. */
  fixtures?: readonly ApiFixture[];
};

export type ScenarioEvalDefinition = {
  target: string;
  resource: string;
  distractors?: readonly string[];
  /** API responses for the target and any lookup tools the model may call first. */
  fixtures: readonly ApiFixture[];
  maxSteps?: number;
  scenarios: ScenarioPrompt[];
};

/**
 * Cases that run real handlers against API fixtures and score the arguments of the
 * target call, rather than requiring one exact call.
 */
export function buildScenarioCases(definition: ScenarioEvalDefinition): TestCase[] {
  return definition.scenarios.map((scenario) => {
    const expect: ScenarioExpectation = { toolName: definition.target, checks: scenario.checks };
    return {
      description: `${definition.target} · scenario · ${scenario.scenario} · ${scenario.input}`,
      vars: {
        prompt: scenario.input,
        target: definition.target,
        fixtures: [...(scenario.fixtures ?? []), ...definition.fixtures],
        expect,
        ...(definition.distractors ? { distractors: definition.distractors } : {}),
        ...(definition.maxSteps ? { maxSteps: definition.maxSteps } : {}),
      },
      options: {
        disableVarExpansion: true,
      },
      metadata: {
        tool: definition.target,
        resource: definition.resource,
        phrasing: "scenario",
        scenario: scenario.scenario,
      },
      assert: [
        {
          type: "javascript",
          value: "file://_lib/assertScenario.ts",
        },
      ],
    };
  });
}
