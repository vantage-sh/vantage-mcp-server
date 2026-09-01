import { type ToolSet, tool } from "ai";
import z from "zod/v4";
import "../../src/tools";
import { getRegisteredTool } from "../../src/tools/structure/registerTool";

export function buildAiSdkTools(names: readonly string[]): ToolSet {
  const out: ToolSet = {};
  for (const name of names) {
    const props = getRegisteredTool(name);
    if (!props) {
      throw new Error(`Tool not registered: ${name}. Did src/tools/index.ts forget to import it?`);
    }
    out[name] = tool({
      description: props.description,
      inputSchema: z.object(props.args),
      // OpenAI Responses API fills omitted optionals with "" / placeholders unless
      // strict is explicitly false. Chat Completions omits them correctly either way.
      strict: false,
      execute: async () => ({}),
    });
  }
  return out;
}
