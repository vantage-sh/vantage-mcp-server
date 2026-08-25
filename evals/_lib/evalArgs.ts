export type ParsedEvalArgs = {
  all: boolean;
  help: boolean;
  listModels: boolean;
  tool?: string;
  model?: string;
  passthrough: string[];
};

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
    return "--tool <name> is required. To deliberately refresh every tool, use npm run eval:all -- --model <id[-effort]>.";
  }
  return undefined;
}
