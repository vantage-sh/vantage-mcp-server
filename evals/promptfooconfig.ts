import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { UnifiedConfig } from "promptfoo";
import { discoverEvalCases, parseSelectedCasePaths } from "./_lib/evalScope";
import { resolveEvalModel } from "./_lib/models";

const here = dirname(fileURLToPath(import.meta.url));

const selected = resolveEvalModel(process.env.EVAL_MODEL);
const discoveredCasePaths = discoverEvalCases(join(here, "cases")).map((evalCase) => evalCase.path);
const selectedCasePaths = parseSelectedCasePaths(process.env.EVAL_CASE_PATHS, discoveredCasePaths);

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
  tests: selectedCasePaths,
  evaluateOptions: {
    maxConcurrency: 4,
  },
};

export default config;
