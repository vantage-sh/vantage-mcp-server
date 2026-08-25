import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluateResult, EvaluateStats, EvaluateSummaryV3, OutputFile } from "promptfoo";
import { modelIdFromLabel } from "./models";

const here = dirname(fileURLToPath(import.meta.url));

export const EVALS_ROOT = join(here, "..");
export const RESULTS_DIR = join(EVALS_ROOT, "results");
export const SITE_DIR = join(EVALS_ROOT, "site");
export const MERGED_RESULTS_PATH = join(RESULTS_DIR, "merged.json");
export const CONFIG_PATH = join(EVALS_ROOT, "promptfooconfig.ts");

function emptyStats(): EvaluateStats {
  return {
    successes: 0,
    failures: 0,
    errors: 0,
    tokenUsage: {
      prompt: 0,
      completion: 0,
      cached: 0,
      total: 0,
      numRequests: 0,
      completionDetails: {
        reasoning: 0,
        acceptedPrediction: 0,
        rejectedPrediction: 0,
      },
    } as EvaluateStats["tokenUsage"],
  };
}

function addTokenUsage(into: EvaluateStats["tokenUsage"], add: EvaluateResult["tokenUsage"]): void {
  if (!add) {
    return;
  }
  into.prompt += add.prompt ?? 0;
  into.completion += add.completion ?? 0;
  into.cached += add.cached ?? 0;
  into.total += add.total ?? 0;
  into.numRequests += add.numRequests ?? 0;
  const details = into.completionDetails ?? {
    reasoning: 0,
    acceptedPrediction: 0,
    rejectedPrediction: 0,
  };
  details.reasoning = (details.reasoning ?? 0) + (add.completionDetails?.reasoning ?? 0);
  details.acceptedPrediction = (details.acceptedPrediction ?? 0) + (add.completionDetails?.acceptedPrediction ?? 0);
  details.rejectedPrediction = (details.rejectedPrediction ?? 0) + (add.completionDetails?.rejectedPrediction ?? 0);
  into.completionDetails = details;
}

export function summarizeResults(results: EvaluateResult[], timestamp = new Date().toISOString()): EvaluateSummaryV3 {
  const stats = emptyStats();
  for (const result of results) {
    if (result.success) {
      stats.successes += 1;
    } else if (result.error) {
      stats.errors += 1;
    } else {
      stats.failures += 1;
    }
    addTokenUsage(stats.tokenUsage, result.tokenUsage);
  }

  return {
    version: 3,
    timestamp,
    results,
    prompts: [],
    stats,
  };
}

export function asOutputFile(results: EvaluateResult[], extras: Partial<OutputFile> = {}): OutputFile {
  return {
    evalId: extras.evalId ?? null,
    results: summarizeResults(results),
    config: extras.config ?? {},
    shareableUrl: extras.shareableUrl ?? null,
    metadata: extras.metadata,
  };
}

export function extractResults(output: OutputFile): EvaluateResult[] {
  return output.results.results ?? [];
}

export function modelIdFromResult(result: EvaluateResult): string {
  const fromMeta = result.metadata?.modelId ?? result.response?.metadata?.modelId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) {
    return fromMeta;
  }

  const fromLabel = modelIdFromLabel(result.provider.label ?? "");
  if (fromLabel) {
    return fromLabel;
  }

  const id = result.provider.id ?? "";
  const match = id.match(/tool-selection:([^:]+):/);
  if (match) {
    return match[1];
  }

  throw new Error(`Could not resolve model id for provider ${result.provider.label ?? result.provider.id}`);
}

export function toolFromResult(result: EvaluateResult): string {
  const fromMeta = result.testCase.metadata?.tool;
  if (typeof fromMeta === "string" && fromMeta.length > 0) {
    return fromMeta;
  }

  const fromVars = result.vars?.target;
  if (typeof fromVars === "string" && fromVars.length > 0) {
    return fromVars;
  }

  throw new Error(`Could not resolve tool for result ${result.description ?? result.id ?? "unknown"}`);
}

export function resourceFromResult(result: EvaluateResult): string {
  const fromMeta = result.testCase.metadata?.resource;
  if (typeof fromMeta === "string" && fromMeta.length > 0) {
    return fromMeta;
  }

  throw new Error(`Could not resolve resource for result ${result.description ?? result.id ?? "unknown"}`);
}

export async function readOutputFile(path: string): Promise<OutputFile> {
  return JSON.parse(await readFile(path, "utf8")) as OutputFile;
}

export async function writeOutputFile(path: string, output: OutputFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

export function resultFilePath(modelId: string, resource: string, tool: string, resultsDir = RESULTS_DIR): string {
  return join(resultsDir, modelId, resource, `${tool}.json`);
}

export function resultCellIdentity(result: EvaluateResult): string {
  return JSON.stringify([
    result.provider.id ?? result.provider.label ?? null,
    resourceFromResult(result),
    toolFromResult(result),
    result.testCase.metadata?.phrasing ?? null,
    result.vars?.prompt ?? result.testCase.description ?? result.description ?? null,
  ]);
}

export function mergeResultCells(stored: EvaluateResult[], rerun: EvaluateResult[]): EvaluateResult[] {
  const replacements = new Map<string, EvaluateResult[]>();
  for (const result of rerun) {
    const key = resultCellIdentity(result);
    const group = replacements.get(key) ?? [];
    group.push(result);
    replacements.set(key, group);
  }

  const consumed = new Set<EvaluateResult>();
  const merged = stored.map((result) => {
    const replacement = replacements.get(resultCellIdentity(result))?.shift();
    if (!replacement) {
      return result;
    }
    consumed.add(replacement);
    return replacement;
  });

  merged.push(...rerun.filter((result) => !consumed.has(result)));
  return merged;
}

type SplitOutputOptions = {
  mergeExisting?: boolean;
  resultsDir?: string;
};

async function readOutputFileIfPresent(path: string): Promise<OutputFile | undefined> {
  try {
    return await readOutputFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function splitOutputIntoToolFiles(
  output: OutputFile,
  options: SplitOutputOptions = {}
): Promise<string[]> {
  const groups = new Map<string, EvaluateResult[]>();
  for (const result of extractResults(output)) {
    const key = `${modelIdFromResult(result)}/${resourceFromResult(result)}/${toolFromResult(result)}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }

  const written: string[] = [];
  for (const [key, results] of groups) {
    const [modelId, resource, tool] = key.split("/");
    const path = resultFilePath(modelId, resource, tool, options.resultsDir);
    const storedOutput = options.mergeExisting ? await readOutputFileIfPresent(path) : undefined;
    const resultsToWrite = storedOutput ? mergeResultCells(extractResults(storedOutput), results) : results;
    await writeOutputFile(path, asOutputFile(resultsToWrite, { config: output.config, metadata: output.metadata }));
    written.push(path);
  }
  return written;
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  if (entries.length === 0) {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(full)));
    } else if (entry.name.endsWith(".json") && entry.name !== "merged.json") {
      files.push(full);
    }
  }
  return files;
}

export async function listStoredResultFiles(): Promise<string[]> {
  const files = await walkJsonFiles(RESULTS_DIR);
  return files.sort();
}

export async function mergeStoredResults(): Promise<OutputFile> {
  const files = await listStoredResultFiles();
  const results: EvaluateResult[] = [];
  let config: OutputFile["config"] = {};
  let metadata: OutputFile["metadata"];

  for (const file of files) {
    const output = await readOutputFile(file);
    results.push(...extractResults(output));
    if (Object.keys(output.config ?? {}).length > 0) {
      config = output.config;
    }
    metadata = output.metadata ?? metadata;
  }

  return asOutputFile(results, { config, metadata });
}
