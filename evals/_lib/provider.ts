import type { ApiProvider, CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import type { LoadingMode } from "./distractors";
import { pickTools } from "./distractors";
import { languageModelFor, parseModelSpec, providerOptionsFor } from "./models";
import { runToolSelection } from "./runToolSelection";
import { toolsFingerprint } from "./toolsFingerprint";

type ProviderConfig = {
  modelId?: string;
  mode?: LoadingMode;
};

export default class ToolSelectionProvider implements ApiProvider {
  readonly config: ProviderConfig;
  readonly label?: string;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as ProviderConfig;
    this.label = options.label;
    const modelId = this.config.modelId ?? "unknown-model";
    const mode = this.config.mode ?? "isolated";
    this.providerId = `tool-selection:${modelId}:${mode}:${toolsFingerprint()}`;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const modelId = this.config.modelId;
    const mode = this.config.mode;
    const target = context?.vars?.target;

    if (!modelId || !mode) {
      return { error: "Provider config must include modelId and mode." };
    }
    if (typeof target !== "string" || target.length === 0) {
      return { error: "Test vars.target must be the tool under evaluation." };
    }

    const handle = parseModelSpec(modelId);
    const toolNames = pickTools(target, mode);
    const result = await runToolSelection({
      prompt,
      model: languageModelFor(handle),
      toolNames,
      providerOptions: providerOptionsFor(handle),
    });

    return {
      output: result,
      metadata: {
        modelId: handle.id,
        mode,
        target,
        toolNames,
        toolCalls: result.toolCalls,
        effort: handle.effort,
      },
    };
  }
}
