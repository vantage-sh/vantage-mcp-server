import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { wrapAISDKModel } from "evalite/ai-sdk";

export type ModelHandle = {
  id: string;
  label: string;
  model: LanguageModel;
};

function wrap(id: string, label: string, model: LanguageModel): ModelHandle {
  return { id, label, model: wrapAISDKModel(model) };
}

export const haiku = wrap("claude-haiku-4-5", "haiku", anthropic("claude-haiku-4-5-20251001"));
export const sonnet = wrap("claude-sonnet-4-6", "sonnet", anthropic("claude-sonnet-4-6"));
export const gpt5Mini = wrap("gpt-5-mini", "gpt-5-mini", openai("gpt-5-mini"));
export const gpt5 = wrap("gpt-5", "gpt-5", openai("gpt-5"));

export const ALL_MODELS: readonly ModelHandle[] = [haiku, sonnet, gpt5Mini, gpt5];
