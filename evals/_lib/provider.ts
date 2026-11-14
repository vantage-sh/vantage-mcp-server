import type { ApiProvider, CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import type { ApiFixture } from "./apiFixtures";
import { pickTools } from "./distractors";
import { languageModelFor, parseModelSpec, providerOptionsFor } from "./models";
import { runToolSelection } from "./runToolSelection";

type ProviderConfig = {
  modelId?: string;
};

export default class ToolSelectionProvider implements ApiProvider {
  readonly config: ProviderConfig;
  readonly label?: string;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as ProviderConfig;
    this.label = options.label;
    const modelId = this.config.modelId ?? "unknown-model";
    this.providerId = `tool-selection:${modelId}:mixed`;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const modelId = this.config.modelId;
    const target = context?.vars?.target;
    const distractors = context?.vars?.distractors;

    if (!modelId) {
      return { error: "Provider config must include modelId." };
    }
    if (typeof target !== "string" || target.length === 0) {
      return { error: "Test vars.target must be the tool under evaluation." };
    }
    if (
      distractors !== undefined &&
      (!Array.isArray(distractors) || distractors.some((name) => typeof name !== "string"))
    ) {
      return { error: "Test vars.distractors must be an array of registered tool names." };
    }
    const fixtures = context?.vars?.fixtures;
    if (fixtures !== undefined && !Array.isArray(fixtures)) {
      return { error: "Test vars.fixtures must be an array of API fixtures." };
    }
    const maxSteps = context?.vars?.maxSteps;
    if (maxSteps !== undefined && (typeof maxSteps !== "number" || maxSteps < 1)) {
      return { error: "Test vars.maxSteps must be a positive number." };
    }

    const handle = parseModelSpec(modelId);
    const toolNames = pickTools(target, distractors as string[] | undefined);
    const result = await runToolSelection({
      prompt,
      model: languageModelFor(handle),
      toolNames,
      providerOptions: providerOptionsFor(handle),
      fixtures: fixtures as ApiFixture[] | undefined,
      maxSteps,
    });

    return {
      output: result,
      metadata: {
        modelId: handle.id,
        mode: "mixed",
        handlers: fixtures ? "fixtures" : "no-op",
        target,
        toolNames,
        toolCalls: result.toolCalls,
        effort: handle.effort,
      },
    };
  }
}
