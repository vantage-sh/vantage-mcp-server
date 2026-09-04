export type ParsedEvalArgs = {
  all: boolean;
  dryRun: boolean;
  help: boolean;
  listModels: boolean;
  model?: string;
  passthrough: string[];
  resources: string[];
  tools: string[];
};

const PARTIAL_RESULT_FILTERS = [
  "--filter-errors-only",
  "--filter-failing",
  "--filter-failing-only",
  "--filter-first-n",
  "--filter-metadata",
  "--filter-pattern",
  "--filter-prompts",
  "--filter-providers",
  "--filter-range",
  "--filter-sample",
  "--filter-targets",
  "-n",
] as const;

export function hasPartialResultFilter(args: readonly string[]): boolean {
  return args.some((arg) => PARTIAL_RESULT_FILTERS.some((filter) => arg === filter || arg.startsWith(`${filter}=`)));
}

export function parseEvalArgs(argv: string[]): ParsedEvalArgs {
  const parsed: ParsedEvalArgs = {
    all: false,
    dryRun: false,
    help: false,
    listModels: false,
    passthrough: [],
    resources: [],
    tools: [],
  };

  const valueAfter = (index: number, flag: string): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tool") {
      parsed.tools.push(valueAfter(i, arg));
      i += 1;
      continue;
    }
    if (arg === "--resource") {
      parsed.resources.push(valueAfter(i, arg));
      i += 1;
      continue;
    }
    if (arg === "--model") {
      parsed.model = valueAfter(i, arg);
      i += 1;
      continue;
    }
    if (arg === "--all") {
      parsed.all = true;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--list-models") {
      parsed.listModels = true;
      continue;
    }
    parsed.passthrough.push(arg);
  }

  return parsed;
}

export function validateEvalScope(args: Pick<ParsedEvalArgs, "all" | "resources" | "tools">): string | undefined {
  const hasSelectors = args.tools.length > 0 || args.resources.length > 0;
  if (args.all && hasSelectors) {
    return "Choose --tool/--resource selectors or the eval:all command, not both.";
  }
  if (!args.all && !hasSelectors) {
    return [
      "At least one --tool <name> or --resource <name> selector is required.",
      "Pass flags after `--` so npm forwards them to the script, e.g. npm run eval -- --tool get-myself --model gpt-5.6-sol-high.",
      "To deliberately refresh every tool, use npm run eval:all -- --model <id[-effort]>.",
    ].join(" ");
  }
  return undefined;
}
