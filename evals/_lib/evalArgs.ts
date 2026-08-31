export type ParsedEvalArgs = {
  all: boolean;
  help: boolean;
  listModels: boolean;
  tool?: string;
  model?: string;
  passthrough: string[];
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
    help: false,
    listModels: false,
    passthrough: [],
  };

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
    if (arg === "--all") {
      parsed.all = true;
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

export function validateEvalScope(args: Pick<ParsedEvalArgs, "all" | "tool">): string | undefined {
  if (args.all && args.tool) {
    return "Choose either --tool <name> or the eval:all command, not both.";
  }
  if (!args.all && !args.tool) {
    return [
      "--tool <name> is required.",
      "Pass flags after `--` so npm forwards them to the script, e.g. npm run eval -- --tool get-myself --model gpt-5.6-sol-high.",
      "To deliberately refresh every tool, use npm run eval:all -- --model <id[-effort]>.",
    ].join(" ");
  }
  return undefined;
}
