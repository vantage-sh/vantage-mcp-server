import "../../src/tools";
import { getRegisteredToolNames } from "../../src/tools/structure/registerTool";

export const DISTRACTOR_COUNT = 4;

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function validateNamedDistractors(
  target: string,
  namedDistractors: readonly string[],
  availableTools: ReadonlySet<string>
): void {
  if (namedDistractors.length > DISTRACTOR_COUNT) {
    throw new Error(`At most ${DISTRACTOR_COUNT} named distractors may be provided for ${target}.`);
  }

  const seen = new Set<string>();
  for (const name of namedDistractors) {
    if (name === target) {
      throw new Error(`Target tool ${target} cannot also be a distractor.`);
    }
    if (seen.has(name)) {
      throw new Error(`Duplicate distractor: ${name}.`);
    }
    if (!availableTools.has(name)) {
      throw new Error(`Distractor tool is not registered: ${name}.`);
    }
    seen.add(name);
  }
}

/**
 * Returns the tools exposed to one eval cell. Every cell keeps named distractors,
 * then fills the remaining slots from every other registered tool.
 * The target-derived shuffle is deterministic so stored evals remain reproducible
 * while different targets receive different samples.
 */
export function pickTools(target: string, namedDistractors: readonly string[] = []): string[] {
  const registeredTools = getRegisteredToolNames().sort();
  const availableTools = new Set(registeredTools);

  if (!availableTools.has(target)) {
    throw new Error(`Target tool is not registered: ${target}. Did src/tools/index.ts forget to import it?`);
  }
  validateNamedDistractors(target, namedDistractors, availableTools);
  const excluded = new Set([target, ...namedDistractors]);
  const sampled = shuffled(
    registeredTools.filter((name) => !excluded.has(name)),
    `vantage-eval-distractors-v1:${target}`
  ).slice(0, DISTRACTOR_COUNT - namedDistractors.length);

  return [target, ...namedDistractors, ...sampled];
}
