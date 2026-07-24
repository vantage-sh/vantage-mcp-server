import MCPUserError from "../tools/structure/MCPUserError";
import type { ToolCallContext } from "../tools/structure/registerTool";

export type AccountCapabilities = {
  /** `Account#msp?` / `is_msp_account` in core. */
  msp: boolean;
};

const MSP_UNAVAILABLE_MESSAGE = "You do not have permission to access this resource.";

function errorMessage(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
}

function isMspUnavailable(errors: unknown[]): boolean {
  return errors.some((error) => errorMessage(error) === MSP_UNAVAILABLE_MESSAGE);
}

/**
 * Resolve account capabilities once per MCP session (after auth).
 * /v2/me doesn't expose MSP status natively, so instead we query an endpoint that has the MSP check in it implicitly.
 * GET /v2/managed_accounts checks for MSP status.
 */
export async function resolveAccountCapabilities(ctx: ToolCallContext): Promise<AccountCapabilities> {
  const response = await ctx.callVantageApi("/v2/managed_accounts", { page: 1, limit: 1 }, "GET");
  if (response.ok) {
    return { msp: true };
  }
  if (isMspUnavailable(response.errors)) {
    return { msp: false };
  }
  throw new MCPUserError({ errors: response.errors });
}

/**
 * Resolve account capabilities for session setup without making tool registration depend on the probe.
 * When the probe fails, callers should continue initializing and omit MSP-gated tools.
 */
export async function resolveAccountCapabilitiesForSession(
  ctx: ToolCallContext
): Promise<AccountCapabilities | undefined> {
  try {
    return await resolveAccountCapabilities(ctx);
  } catch {
    return undefined;
  }
}
