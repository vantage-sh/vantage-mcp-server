import { createHash } from "node:crypto";
import "../../src/tools";
import { getRegisteredTool, getRegisteredToolNames } from "../../src/tools/structure/registerTool";

function fieldHint(field: unknown): string {
  if (!field || typeof field !== "object") {
    return "";
  }
  const record = field as { description?: string; def?: { type?: string } };
  return `${record.description ?? ""}:${record.def?.type ?? ""}`;
}

/**
 * Hash of every registered tool's name, description, and arg field hints.
 * Included in the provider id so promptfoo's cache misses when a description
 * or zod field changes. Avoids z.toJSONSchema — several tools use transforms
 * that cannot be represented as JSON Schema.
 */
export function toolsFingerprint(): string {
  const payload = getRegisteredToolNames()
    .sort()
    .map((name) => {
      const tool = getRegisteredTool(name);
      if (!tool) {
        return name;
      }
      const fields = Object.keys(tool.args)
        .sort()
        .map((key) => `${key}:${fieldHint(tool.args[key])}`)
        .join(",");
      return `${name}\0${tool.description}\0${fields}`;
    })
    .join("\n");

  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}
