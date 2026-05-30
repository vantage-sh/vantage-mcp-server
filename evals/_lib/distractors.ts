/**
 * Five-tool pool used for the "mixed" loading mode. The target tool is filtered
 * out before exposing, so a "mixed" run always loads target + 4 distractors.
 * Picked to span verbs and domains so most targets land next to unrelated
 * neighbours — revisit per-eval if these aren't confusable enough for a given
 * tool.
 */
export const DISTRACTOR_POOL = [
  "get-myself",
  "list-cost-providers",
  "query-costs",
  "list-anomalies",
  "submit-user-feedback",
] as const;

export type LoadingMode = "isolated" | "mixed";

export function pickTools(target: string, mode: LoadingMode): string[] {
  if (mode === "isolated") return [target];
  const distractors = DISTRACTOR_POOL.filter((t) => t !== target).slice(0, 4);
  return [target, ...distractors];
}
