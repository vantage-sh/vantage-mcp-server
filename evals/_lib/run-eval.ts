import { spawn } from "node:child_process";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatApprovedModels, parseModelSpec } from "./models";
import { CONFIG_PATH, EVALS_ROOT, readOutputFile, splitOutputIntoToolFiles } from "./resultsStore";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const tmpOutputPath = join(EVALS_ROOT, ".tmp-eval.json");
const promptfooBin = join(repoRoot, "node_modules", ".bin", "promptfoo");

type ParsedArgs = {
  tool?: string;
  model?: string;
  passthrough: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { passthrough: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tool") {
      parsed.tool = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--model") {
      parsed.model = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--list-models") {
      console.log(formatApprovedModels());
      process.exit(0);
    }
    parsed.passthrough.push(arg);
  }
  return parsed;
}

function printHelp(): void {
  console.log(`Run Vantage MCP tool-selection evals.

Usage:
  npm run eval -- --model <id[-effort]> [--tool <name>] [promptfoo flags...]

--model is required. Effort is optional when the model supports it
(gpt-5.6-sol uses the provider default; gpt-5.6-sol-high sets high).

Examples:
  npm run eval -- --tool get-myself --model gpt-5.6-sol-high
  npm run eval -- --tool get-myself --model claude-haiku-4-5
  npm run eval -- --tool get-myself --model gpt-5.6-sol-high --no-cache
  npm run eval -- --filter-failing evals/results/gpt-5.6-sol-high/current-user/get-myself.json --model gpt-5.6-sol-high

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
  const { tool, model, passthrough } = parseArgs(process.argv.slice(2));
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

  const args = ["eval", "-c", CONFIG_PATH, "-o", tmpOutputPath, ...passthrough];
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
