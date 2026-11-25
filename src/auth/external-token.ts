import type { ResolveExternalTokenInput, ResolveExternalTokenResult } from "@cloudflare/workers-oauth-provider";
import type { UserProps } from "./types";

export async function resolveVantageToken({
  token,
  request,
}: Pick<ResolveExternalTokenInput, "token" | "request">): Promise<ResolveExternalTokenResult | null> {
  // Recognize Vantage credentials here; Core authenticates and authorizes each
  // tool call. No extra validation request is needed for each MCP exchange.
  if (!/^vntg_[A-Za-z0-9_-]+$/.test(token)) return null;

  return {
    audience: new URL("/mcp", request.url).href,
    props: { tokenSet: { accessToken: token } } satisfies Pick<UserProps, "tokenSet">,
  };
}
