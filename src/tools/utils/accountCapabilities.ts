import MCPUserError from "../structure/MCPUserError";
import type { ToolCallContext } from "../structure/registerTool";

export type AccountCapabilities = {
  /** `Account#msp?` / `is_msp_account` in core. */
  msp: boolean;
};

const MSP_UNAVAILABLE_MESSAGE = "This feature is not available for this account.";

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
 * GET /v2/exchange_rates checks for MSP status.
 */
export async function resolveAccountCapabilities(ctx: ToolCallContext): Promise<AccountCapabilities> {
  const response = await ctx.callVantageApi("/v2/exchange_rates", { page: 1, limit: 1 }, "GET");
  if (response.ok) {
    return { msp: true };
  }
  if (isMspUnavailable(response.errors)) {
    return { msp: false };
  }
  throw new MCPUserError({ errors: response.errors });
}
