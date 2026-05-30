import type { LanguageModel } from "ai";
import { ALL_MODELS, type ModelHandle } from "./models";
import type { LoadingMode } from "./distractors";

export type ToolEvalVariant = {
  model: LanguageModel;
  modelId: string;
  mode: LoadingMode;
};

type EvaliteEachVariant = { name: string; input: ToolEvalVariant };

function variant(model: ModelHandle, mode: LoadingMode): EvaliteEachVariant {
  return {
    name: `${model.label} · ${mode}`,
    input: { model: model.model, modelId: model.id, mode },
  };
}

/**
 * Cartesian product of {model} × {isolated, mixed} for every model in
 * ALL_MODELS. 4 models × 2 modes = 8 variants per suite by default.
 */
export const TOOL_EVAL_VARIANTS: EvaliteEachVariant[] = ALL_MODELS.flatMap((m) => [
  variant(m, "isolated"),
  variant(m, "mixed"),
]);
