/**
 * Intentional gaps between MCP tool schemas and the OpenAPI spec.
 * Add entries here when the API keeps a field for backwards compatibility (or similar)
 * but the MCP tool deliberately does not expose it.
 *
 * Match rules (all optional fields are AND filters when present):
 * - operation: OpenAPI operation id (e.g. getRecommendations)
 * - tool: MCP tool name (e.g. list-recommendations)
 * - apiKey: parameter name as it appears in the client types
 * - kind: "missing" = do not report "Missing from tool schema"; "extra" = do not report "Extra in tool schema"
 */

export type SchemaDriftExclusion = {
  operation?: string;
  tool?: string;
  apiKey: string;
  kind: "missing" | "extra";
  reason?: string;
};

export const SCHEMA_DRIFT_EXCLUSIONS: SchemaDriftExclusion[] = [
  {
    operation: "getRecommendations",
    tool: "list-recommendations",
    apiKey: "category",
    kind: "missing",
    reason: "Superseded by type in MCP; category remains on the API for backwards compatibility",
  },
];
