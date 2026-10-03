export const CONFIRMATION_HEADER = "X-MCP-Confirm";
export type MutationOperation = "create" | "update" | "delete";
export type ConfirmationPolicy = { selectors: ReadonlySet<string>; key: string };

export function mutationOperation(name: string): MutationOperation | undefined {
  return /^(create|update|delete)-/.exec(name)?.[1] as MutationOperation | undefined;
}

export function parseConfirmationPolicy(
  value: string | null | undefined,
  toolNames: readonly string[]
): ConfirmationPolicy {
  if (value == null) return { selectors: new Set(), key: "none" };
  const parts = value.split(",").map((part) => part.trim().toLowerCase());
  const valid = new Set(["all", "none", "create", "update", "delete", ...toolNames.filter(mutationOperation)]);
  if (
    value.length > 8192 ||
    parts.some((part) => !valid.has(part)) ||
    (parts.length > 1 && parts.some((part) => part === "all" || part === "none"))
  ) {
    throw new Error(
      `${CONFIRMATION_HEADER} must be all, none, or comma-separated create/update/delete categories and mutation tool names.`
    );
  }
  const selectors = new Set(parts[0] === "none" ? [] : parts);
  return { selectors, key: [...selectors].sort().join(",") || "none" };
}

export function requiresConfirmation(policy: ConfirmationPolicy, toolName: string): boolean {
  const operation = mutationOperation(toolName);
  return (
    !!operation && (policy.selectors.has("all") || policy.selectors.has(operation) || policy.selectors.has(toolName))
  );
}
