import { spawn } from "node:child_process";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasPartialResultFilter, parseEvalArgs, validateEvalScope } from "./evalArgs";
import { finalizeEvalRun } from "./evalRunLifecycle";
import { discoverEvalCases, selectEvalCases } from "./evalScope";
import { formatApprovedModels, parseModelSpec } from "./models";
import { CONFIG_PATH, EVALS_ROOT, readOutputFile, splitOutputIntoToolFiles } from "./resultsStore";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const tmpOutputPath = join(EVALS_ROOT, ".tmp-eval.json");
const promptfooBin = join(repoRoot, "node_modules", ".bin", "promptfoo");

function printHelp(): void {
  console.log(`Run Vantage MCP tool-selection evals.

Usage:
  npm run eval -- (--tool <name> | --resource <name>)... --model <id[-effort]> [promptfoo flags...]
  npm run eval -- (--tool <name> | --resource <name>)... --dry-run
  npm run eval:all -- --model <id[-effort]> [promptfoo flags...]

--tool selects one exact tool and may be repeated. --resource selects every eval
case in one exact resource directory and may be repeated. Use eval:all for an
intentional full refresh. --dry-run prints the resolved scope without model calls.
--model is required unless --dry-run is used. Effort is optional when the model supports it
(gpt-5.6-sol uses the provider default; gpt-5.6-sol-high sets high).
Every invocation makes fresh model calls; committed result JSON is the retained baseline.
Unfiltered runs replace selected result files. Partial promptfoo filters merge rerun
cells into those files and preserve cells omitted by the filter.

Examples:
  npm run eval -- --tool get-myself --model gpt-5.6-sol-high
  npm run eval -- --tool get-team --tool get-teams --model gpt-5.6-sol-high
  npm run eval -- --resource teams --model gpt-5.6-sol-high
  npm run eval -- --resource teams/ --dry-run
  npm run eval -- --tool get-myself --model claude-haiku-4-5
  npm run eval -- --tool get-myself --filter-failing evals/results/gpt-5.6-sol-high/current-user/get-myself.json --model gpt-5.6-sol-high
  npm run eval:all -- --model gpt-5.6-sol-high

${formatApprovedModels()}
`);
}

function runPromptfoo(args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(promptfooBin, args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
        PROMPTFOO_CONFIG_DIR: join(EVALS_ROOT, ".promptfoo"),
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function cleanupTmpOutput(): Promise<void> {
  await unlink(tmpOutputPath).catch(() => undefined);
}

function printSelectedCases(cases: readonly { resource: string; tool: string }[]): void {
  console.log(`Selected ${cases.length} tool eval${cases.length === 1 ? "" : "s"}:`);
  for (const evalCase of cases) {
    console.log(`  ${evalCase.resource}/${evalCase.tool}`);
  }
}

async function main(): Promise<void> {
  const parsed = parseEvalArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }
  if (parsed.listModels) {
    console.log(formatApprovedModels());
    return;
  }

  const scopeError = validateEvalScope(parsed);
  if (scopeError) {
    console.error(`Error: ${scopeError}`);
    process.exit(1);
  }

  const selectedCases = selectEvalCases(discoverEvalCases(join(EVALS_ROOT, "cases")), parsed);
  printSelectedCases(selectedCases);
  if (parsed.dryRun) {
    return;
  }

  const { model, passthrough } = parsed;
  const mergeExistingResults = hasPartialResultFilter(passthrough);
  if (!model) {
    console.error(`Error: --model is required.\n\n${formatApprovedModels()}`);
    process.exit(1);
  }

  let selected: ReturnType<typeof parseModelSpec>;
  try {
    selected = parseModelSpec(model);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  await mkdir(EVALS_ROOT, { recursive: true });
  await cleanupTmpOutput();

  const args = ["eval", "-c", CONFIG_PATH, "-o", tmpOutputPath, "--no-cache", ...passthrough];

  const code = await runPromptfoo(args, {
    EVAL_CASE_PATHS: JSON.stringify(selectedCases.map((evalCase) => evalCase.path)),
    EVAL_MODEL: selected.id,
  });
  const written = await finalizeEvalRun(
    code,
    async () => {
      const output = await readOutputFile(tmpOutputPath);
      return splitOutputIntoToolFiles(output, { mergeExisting: mergeExistingResults });
    },
    cleanupTmpOutput
  );

  if (!written) {
    process.exitCode = code;
    return;
  }

  console.log(`Wrote ${written.length} result file(s):`);
  for (const path of written) {
    console.log(`  ${path}`);
  }

  process.exitCode = code;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
