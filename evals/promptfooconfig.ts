import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { UnifiedConfig } from "promptfoo";
import { resolveEvalModel } from "./_lib/models";

const here = dirname(fileURLToPath(import.meta.url));

function casePaths(dir = join(here, "cases"), prefix = "cases"): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const nextPrefix = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        return casePaths(join(dir, entry.name), nextPrefix);
      }
      return entry.name.endsWith(".eval.ts") ? [`file://${nextPrefix}`] : [];
    });
}

const selected = resolveEvalModel(process.env.EVAL_MODEL);

const config: Partial<UnifiedConfig> = {
  description: "Vantage MCP tool-selection evals",
  prompts: ["{{prompt}}"],
  providers: [
    {
      id: "file://_lib/provider.ts",
      label: `${selected.id} · mixed`,
      config: {
        modelId: selected.id,
      },
    },
  ],
  tests: casePaths(),
  evaluateOptions: {
    maxConcurrency: 4,
  },
};

export default config;
