import type { ResolveExternalTokenInput, ResolveExternalTokenResult } from "@cloudflare/workers-oauth-provider";
import type { UserProps } from "./types";

export async function resolveVantageToken({
  token,
  request,
}: Pick<ResolveExternalTokenInput, "token" | "request">): Promise<ResolveExternalTokenResult | null> {
  // Recognize Vantage credentials here; Core authenticates and authorizes each
  // tool call. No extra validation request is needed for each MCP exchange.
  if (!/^vntg_[A-Za-z0-9_-]+$/.test(token)) return null;

  const path = new URL(request.url).pathname.startsWith("/sse") ? "/sse" : "/mcp";
  return {
    audience: new URL(path, request.url).href,
    props: { tokenSet: { accessToken: token } } satisfies Pick<UserProps, "tokenSet">,
  };
}
