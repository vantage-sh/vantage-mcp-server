import { spawn } from "node:child_process";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvalArgs, validateEvalScope } from "./evalArgs";
import { formatApprovedModels, parseModelSpec } from "./models";
import { CONFIG_PATH, EVALS_ROOT, readOutputFile, splitOutputIntoToolFiles } from "./resultsStore";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const tmpOutputPath = join(EVALS_ROOT, ".tmp-eval.json");
const promptfooBin = join(repoRoot, "node_modules", ".bin", "promptfoo");

function printHelp(): void {
  console.log(`Run Vantage MCP tool-selection evals.

Usage:
  npm run eval -- --tool <name> --model <id[-effort]> [promptfoo flags...]
  npm run eval:all -- --model <id[-effort]> [promptfoo flags...]

The normal command requires --tool. Use eval:all for an intentional full refresh.
--model is always required. Effort is optional when the model supports it
(gpt-5.6-sol uses the provider default; gpt-5.6-sol-high sets high).
Every invocation makes fresh model calls; committed result JSON is the retained baseline.

Examples:
  npm run eval -- --tool get-myself --model gpt-5.6-sol-high
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

  const { tool, model, passthrough } = parsed;
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

  const args = ["eval", "-c", CONFIG_PATH, "-o", tmpOutputPath, "--no-cache", ...passthrough];
  if (tool) {
    args.push("--filter-metadata", `tool=${tool}`);
  }

  const code = await runPromptfoo(args, { EVAL_MODEL: selected.id });
  if (code !== 0) {
    process.exit(code);
  }

  const output = await readOutputFile(tmpOutputPath);
  const written = await splitOutputIntoToolFiles(output);
  await unlink(tmpOutputPath).catch(() => undefined);

  console.log(`Wrote ${written.length} result file(s):`);
  for (const path of written) {
    console.log(`  ${path}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
