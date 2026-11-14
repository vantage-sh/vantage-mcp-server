import { generateText, type LanguageModel, type StopCondition, stepCountIs, type ToolSet } from "ai";
import type { ApiFixture } from "./apiFixtures";
import type { ToolCallRecord } from "./assertToolCalls";
import { buildAiSdkTools, type FixtureExecution } from "./buildAiSdkTools";
import type { ProviderCallOptions } from "./models";

export const DEFAULT_FIXTURE_MAX_STEPS = 6;

export type RunToolSelectionResult = {
  toolCalls: ToolCallRecord[];
  text: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

/** Stops after the step in which the model reaches `count` calls to `target`. */
function targetCallCountIs(target: string, count: number): StopCondition<ToolSet> {
  return ({ steps }) =>
    steps.flatMap((step) => step.toolCalls).filter((call) => call.toolName === target).length >= count;
}

/**
 * Without fixtures, the model gets one step. With fixtures, handlers run against canned
 * API responses and the model keeps going, including retries after a bad response,
 * until it stops calling tools, reaches `maxSteps`, or makes `maxTargetCalls` calls to `target`.
 */
export async function runToolSelection(opts: {
  prompt: string;
  model: LanguageModel;
  toolNames: readonly string[];
  providerOptions?: ProviderCallOptions;
  fixtures?: readonly ApiFixture[];
  maxSteps?: number;
  target?: string;
  maxTargetCalls?: number;
}): Promise<RunToolSelectionResult> {
  const fixtureExecution: FixtureExecution | undefined = opts.fixtures
    ? { fixtures: opts.fixtures, executions: new Map() }
    : undefined;
  const tools = buildAiSdkTools(opts.toolNames, fixtureExecution);
  const stopWhen = fixtureExecution
    ? [
        stepCountIs(opts.maxSteps ?? DEFAULT_FIXTURE_MAX_STEPS),
        ...(opts.target && opts.maxTargetCalls ? [targetCallCountIs(opts.target, opts.maxTargetCalls)] : []),
      ]
    : stepCountIs(1);

  const result = await generateText({
    model: opts.model,
    tools,
    prompt: opts.prompt,
    providerOptions: opts.providerOptions,
    stopWhen,
  });

  const toolCalls = result.steps
    .flatMap((step) => step.toolCalls)
    .map((call): ToolCallRecord => {
      const record: ToolCallRecord = { toolName: call.toolName, input: call.input };
      const log = fixtureExecution?.executions.get(call.toolCallId);
      if (log) {
        record.requests = log.requests;
        if (log.error) {
          record.error = log.error;
        }
      }
      if (call.dynamic && call.invalid) {
        record.error = errorMessage(call.error);
      }
      return record;
    });

  return { toolCalls, text: result.text };
}
