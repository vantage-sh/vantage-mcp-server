import type { TestCase } from "promptfoo";
import type { ApiFixture } from "./apiFixtures";
import type { ScenarioExpectation } from "./assertScenario";
import type { ToolCallRecord } from "./assertToolCalls";
import type { CallCheck } from "./checks";

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
  /** What a correct target call looks like. The first target call is scored against these. */
  checks: CallCheck[];
  /** Served for the target's request when every check passes: data that answers the prompt. */
  correct: ApiFixture;
  /** Served when any check fails. Defaults to the definition's `incorrect` response. */
  incorrect?: ApiFixture;
  /**
   * Checked after `correct` and before `incorrect`, so a scenario can return a specific API error
   * for a known mistake or override a shared lookup.
   */
  fixtures?: readonly ApiFixture[];
  /** Overrides the definition's `maxTargetCalls` for this scenario. */
  maxTargetCalls?: number;
};

export type ScenarioEvalDefinition = {
  target: string;
  resource: string;
  distractors?: readonly string[];
  /** Default response for a wrong target call, such as an empty result, so the model retries. */
  incorrect: ApiFixture;
  /** API responses for any lookup tools the model may call. */
  fixtures: readonly ApiFixture[];
  maxSteps?: number;
  /** Stop the run once the model has called the target this many times. Unset, it runs until `maxSteps`. */
  maxTargetCalls?: number;
  scenarios: ScenarioPrompt[];
};

/**
 * Cases that run real handlers against API fixtures. A correct target call gets data that
 * answers the prompt and a wrong one gets the `incorrect` response, so the model can retry.
 * Only the first target call is scored.
 */
export function buildScenarioCases(definition: ScenarioEvalDefinition): TestCase[] {
  return definition.scenarios.map((scenario) => {
    const expect: ScenarioExpectation = { toolName: definition.target, checks: scenario.checks };
    const correct: ApiFixture = { ...scenario.correct, when: scenario.checks };
    const maxTargetCalls = scenario.maxTargetCalls ?? definition.maxTargetCalls;
    return {
      description: `${definition.target} · scenario · ${scenario.scenario} · ${scenario.input}`,
      vars: {
        prompt: scenario.input,
        target: definition.target,
        fixtures: [
          correct,
          ...(scenario.fixtures ?? []),
          scenario.incorrect ?? definition.incorrect,
          ...definition.fixtures,
        ],
        expect,
        ...(definition.distractors ? { distractors: definition.distractors } : {}),
        ...(definition.maxSteps ? { maxSteps: definition.maxSteps } : {}),
        ...(maxTargetCalls ? { maxTargetCalls } : {}),
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
