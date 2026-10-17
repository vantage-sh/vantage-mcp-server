export const CONFIRMATION_HEADER = "X-MCP-Confirm";
export type MutationOperation = "create" | "update" | "delete";
export type ConfirmationPolicy = { selectors: ReadonlySet<string>; key: string };
export type ConfirmableTool = { name: string; annotations: { readOnly: boolean } };

const OPERATION_BY_VERB: Record<string, MutationOperation> = {
  create: "create",
  add: "create",
  submit: "create",
  update: "update",
  delete: "delete",
  remove: "delete",
};

/**
 * Every tool not annotated read-only is a mutation. Its leading verb picks the
 * category; any other state change counts as an update so it is never ungated.
 */
export function mutationOperation(tool: ConfirmableTool): MutationOperation | undefined {
  if (tool.annotations.readOnly) return undefined;
  return OPERATION_BY_VERB[tool.name.split("-")[0]] ?? "update";
}

export function parseConfirmationPolicy(
  value: string | null | undefined,
  tools: readonly ConfirmableTool[]
): ConfirmationPolicy {
  if (value == null) return { selectors: new Set(), key: "none" };
  const parts = value.split(",").map((part) => part.trim().toLowerCase());
  const mutationNames = tools.filter((tool) => mutationOperation(tool)).map((tool) => tool.name);
  const valid = new Set(["all", "none", "create", "update", "delete", ...mutationNames]);
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

export function requiresConfirmation(policy: ConfirmationPolicy, tool: ConfirmableTool): boolean {
  const operation = mutationOperation(tool);
  return (
    !!operation && (policy.selectors.has("all") || policy.selectors.has(operation) || policy.selectors.has(tool.name))
  );
}
