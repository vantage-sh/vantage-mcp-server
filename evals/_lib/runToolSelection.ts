import { generateText, type LanguageModel } from "ai";
import { buildAiSdkTools } from "./buildAiSdkTools";

export type ToolCallRecord = {
  toolName: string;
  input?: unknown;
};

export type RunToolSelectionResult = {
  toolCalls: ToolCallRecord[];
  text: string;
};

export async function runToolSelection(opts: {
  prompt: string;
  model: LanguageModel;
  toolNames: readonly string[];
}): Promise<RunToolSelectionResult> {
  const tools = buildAiSdkTools(opts.toolNames);

  const result = await generateText({
    model: opts.model,
    tools,
    prompt: opts.prompt,
  });

  return {
    toolCalls: result.toolCalls.map((call) => ({
      toolName: call.toolName,
      input: call.input,
    })),
    text: result.text,
  };
}
