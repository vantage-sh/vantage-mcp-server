import { tool, type ToolSet } from "ai";
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
      execute: async () => ({}),
    });
  }
  return out;
}
