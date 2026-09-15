import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCallContext } from "../structure/registerTool";

export const ACCESS_POLICY_TOOL_NAMES = [
  "list-access-policies",
  "create-access-policy",
  "update-access-policy",
  "delete-access-policy",
];

/**
 * Access Policy tools are account-owner only. Anything short of the API
 * confirming ownership hides them, so a failed or unrecognised lookup is treated
 * as "not an owner" rather than granting access by default.
 *
 * Call before connecting the transport so the tools never appear in the first
 * `tools/list` response.
 */
export async function hideAccessPolicyToolsFromNonOwners(
  tools: Map<string, RegisteredTool>,
  ctx: ToolCallContext
): Promise<void> {
  if (await isAccountOwner(ctx)) {
    return;
  }

  for (const name of ACCESS_POLICY_TOOL_NAMES) {
    tools.get(name)?.disable();
  }
}

async function isAccountOwner(ctx: ToolCallContext): Promise<boolean> {
  try {
    const response = await ctx.callVantageApi("/v2/me", {}, "GET");
    return response.ok && response.data.is_account_owner === true;
  } catch {
    // Runs during server startup, where callVantageApi throws on missing
    // credentials or network failure. Swallow it so the session still starts.
    return false;
  }
}
