import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const OPENAI_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;
export const ANTHROPIC_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

export type OpenAIEffort = (typeof OPENAI_EFFORTS)[number];
export type AnthropicEffort = (typeof ANTHROPIC_EFFORTS)[number];
export type EffortLevel = OpenAIEffort | AnthropicEffort;
export type ModelProvider = "openai" | "anthropic";

type OpenAIApprovedModel = {
  id: string;
  provider: "openai";
  efforts: readonly OpenAIEffort[];
};

type AnthropicApprovedModel = {
  id: string;
  provider: "anthropic";
  efforts: readonly AnthropicEffort[];
};

export type ApprovedModel = OpenAIApprovedModel | AnthropicApprovedModel;

/**
 * Models we will run evals against, each with the thinking/effort levels that
 * model actually accepts. Effort is optional on the CLI: `gpt-5.6-sol` uses
 * the provider default, `gpt-5.6-sol-high` sets high. Models with an empty
 * `efforts` list (e.g. Haiku 4.5) only accept the bare model id.
 */
export const APPROVED_MODELS: readonly ApprovedModel[] = [
  { id: "gpt-5.6-sol", provider: "openai", efforts: OPENAI_EFFORTS },
  { id: "gpt-5.6-terra", provider: "openai", efforts: OPENAI_EFFORTS },
  { id: "gpt-5.6-luna", provider: "openai", efforts: OPENAI_EFFORTS },
  { id: "claude-sonnet-5", provider: "anthropic", efforts: ANTHROPIC_EFFORTS },
  { id: "claude-opus-5", provider: "anthropic", efforts: ANTHROPIC_EFFORTS },
  { id: "claude-haiku-4-5", provider: "anthropic", efforts: [] },
];

export type ModelHandle = {
  /** CLI / results-folder slug, e.g. `gpt-5.6-sol-high` or `claude-haiku-4-5`. */
  id: string;
  modelId: string;
  provider: ModelProvider;
  effort?: EffortLevel;
};

export type ProviderCallOptions = {
  openai?: { reasoningEffort: OpenAIEffort };
  anthropic?: { effort: AnthropicEffort };
};

/** Accept `gpt-5.6.sol-high` as `gpt-5.6-sol-high`. Dots between digits stay. */
export function normalizeModelSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\.(?!\d)/g, "-");
}

export function formatApprovedModels(): string {
  const lines = APPROVED_MODELS.map((model) => {
    const efforts = model.efforts.length > 0 ? `efforts: ${model.efforts.join(", ")}` : "(no effort levels)";
    return `  ${model.id.padEnd(20)} ${efforts}`;
  });
  return [
    "Approved eval models (pass --model <id> or <id>-<effort>):",
    "",
    ...lines,
    "",
    "Example: --model gpt-5.6-sol-high",
  ].join("\n");
}

function approvedByLongestId(): ApprovedModel[] {
  return [...APPROVED_MODELS].sort((a, b) => b.id.length - a.id.length);
}

export function parseModelSpec(raw: string): ModelHandle {
  const slug = normalizeModelSlug(raw);
  if (slug.length === 0) {
    throw new Error(`--model is required.\n\n${formatApprovedModels()}`);
  }

  for (const model of approvedByLongestId()) {
    if (slug === model.id) {
      return { id: model.id, modelId: model.id, provider: model.provider };
    }
    if (!slug.startsWith(`${model.id}-`)) {
      continue;
    }

    const effort = slug.slice(model.id.length + 1);
    if (model.efforts.length === 0) {
      throw new Error(
        `${model.id} does not support effort levels. Use --model ${model.id}.\n\n${formatApprovedModels()}`
      );
    }
    if (!(model.efforts as readonly string[]).includes(effort)) {
      throw new Error(
        `Unknown effort "${effort}" for ${model.id}. Supported: ${model.efforts.join(", ")}.\n\n${formatApprovedModels()}`
      );
    }

    return {
      id: `${model.id}-${effort}`,
      modelId: model.id,
      provider: model.provider,
      effort: effort as EffortLevel,
    };
  }

  throw new Error(`Unknown eval model "${raw}".\n\n${formatApprovedModels()}`);
}

export function resolveEvalModel(raw: string | undefined): ModelHandle {
  if (raw === undefined || raw.trim().length === 0) {
    throw new Error(
      "EVAL_MODEL is not set. Run evals with `npm run eval -- --tool <name> --model gpt-5.6-sol-high` or select a resource with `--resource <name>`."
    );
  }
  return parseModelSpec(raw);
}

export function languageModelFor(handle: ModelHandle): LanguageModel {
  return handle.provider === "openai" ? openai(handle.modelId) : anthropic(handle.modelId);
}

export function getModel(id: string): LanguageModel {
  return languageModelFor(parseModelSpec(id));
}

export function providerOptionsFor(handle: ModelHandle): ProviderCallOptions | undefined {
  if (!handle.effort) {
    return undefined;
  }
  if (handle.provider === "openai") {
    return { openai: { reasoningEffort: handle.effort as OpenAIEffort } };
  }
  return { anthropic: { effort: handle.effort as AnthropicEffort } };
}

export function modelIdFromLabel(label: string): string | undefined {
  const prefix = label.split(" · ")[0];
  if (!prefix) {
    return undefined;
  }
  try {
    return parseModelSpec(prefix).id;
  } catch {
    return undefined;
  }
}
