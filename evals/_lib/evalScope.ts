import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const CASE_FILE_SUFFIX = ".eval.ts";

export type EvalCaseFile = {
  path: string;
  resource: string;
  tool: string;
};

export type EvalScope = {
  all: boolean;
  resources: readonly string[];
  tools: readonly string[];
};

function normalizeResource(resource: string): string {
  return resource.trim().replace(/^\/+|\/+$/g, "");
}

export function discoverEvalCases(casesDir: string): EvalCaseFile[] {
  function walk(dir: string): EvalCaseFile[] {
    return readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(fullPath);
        }
        if (!entry.name.endsWith(CASE_FILE_SUFFIX)) {
          return [];
        }

        const relativePath = relative(casesDir, fullPath).split(sep).join("/");
        const pathParts = relativePath.split("/");
        if (pathParts.length < 2) {
          throw new Error(`Eval case must be under a resource directory: ${relativePath}`);
        }

        return [
          {
            path: `file://cases/${relativePath}`,
            resource: pathParts.slice(0, -1).join("/"),
            tool: entry.name.slice(0, -CASE_FILE_SUFFIX.length),
          },
        ];
      });
  }

  return walk(casesDir);
}

export function selectEvalCases(cases: readonly EvalCaseFile[], scope: EvalScope): EvalCaseFile[] {
  if (scope.all) {
    return [...cases];
  }

  const requestedTools = [...new Set(scope.tools.map((tool) => tool.trim()))];
  const requestedResources = [...new Set(scope.resources.map(normalizeResource))];
  const selectedPaths = new Set<string>();

  for (const tool of requestedTools) {
    const matches = cases.filter((candidate) => candidate.tool === tool);
    if (matches.length === 0) {
      throw new Error(`No eval case found for tool: ${tool || "<empty>"}`);
    }
    if (matches.length > 1) {
      throw new Error(`Tool selector is ambiguous across resources: ${tool}`);
    }
    selectedPaths.add(matches[0].path);
  }

  for (const resource of requestedResources) {
    const matches = cases.filter((candidate) => candidate.resource === resource);
    if (matches.length === 0) {
      throw new Error(`No eval cases found for resource: ${resource || "<empty>"}`);
    }
    for (const match of matches) {
      selectedPaths.add(match.path);
    }
  }

  return cases.filter((candidate) => selectedPaths.has(candidate.path));
}

export function parseSelectedCasePaths(raw: string | undefined, fallback: readonly string[]): string[] {
  if (raw === undefined) {
    return [...fallback];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((path) => typeof path !== "string")) {
    throw new Error("EVAL_CASE_PATHS must be a non-empty JSON array of case paths.");
  }
  return parsed;
}
