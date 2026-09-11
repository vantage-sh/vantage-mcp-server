import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isDefinitelyNotAccountOwner } from "../current-user/me";
import type { ToolCallContext } from "../structure/registerTool";

export const ACCESS_POLICY_TOOL_NAMES = [
  "list-access-policies",
  "create-access-policy",
  "update-access-policy",
  "delete-access-policy",
];

/**
 * Access Policy tools are account-owner only. Hiding them is a convenience so
 * non-owners are not offered calls that can only fail — the Vantage API is the
 * real boundary and returns 403 whether or not the tool was advertised. Because
 * of that, a failed lookup leaves the tools visible rather than hiding them from
 * an owner over a transient error.
 *
 * Call before connecting the transport so the tools never appear in the first
 * `tools/list` response.
 */
export async function hideAccessPolicyToolsFromNonOwners(
  tools: Map<string, RegisteredTool>,
  ctx: ToolCallContext
): Promise<void> {
  const response = await ctx.callVantageApi("/v2/me", {}, "GET");
  if (!response.ok || !isDefinitelyNotAccountOwner(response.data)) {
    return;
  }

  for (const name of ACCESS_POLICY_TOOL_NAMES) {
    tools.get(name)?.disable();
  }
}
