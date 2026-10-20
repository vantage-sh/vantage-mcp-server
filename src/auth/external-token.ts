import {
  ExternalTokenError,
  type ResolveExternalTokenInput,
  type ResolveExternalTokenResult,
} from "@cloudflare/workers-oauth-provider";
import type { AppEnv } from "../env";
import { serverMeta } from "../shared";
import type { UserProps } from "./types";

export async function resolveVantageToken({
  token,
  request,
  env,
}: ResolveExternalTokenInput<Pick<AppEnv, "VANTAGE_API_HOST">>): Promise<ResolveExternalTokenResult | null> {
  // Other credentials, including unknown OAuth tokens, belong to the provider.
  if (!/^vntg_[A-Za-z0-9_-]+$/.test(token)) return null;

  let response: Response;
  try {
    response = await fetch(new URL("/v2/me", env.VANTAGE_API_HOST), {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": `vantage-mcp-server/${serverMeta.version}`,
      },
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
  } catch {
    throw new ExternalTokenError("temporarily_unavailable", {
      description: "Vantage token validation is temporarily unavailable",
      statusCode: 503,
    });
  }
  await response.body?.cancel();

  if (response.status === 401) {
    throw new ExternalTokenError("invalid_token", {
      description: "Invalid Vantage API token",
      statusCode: 401,
    });
  }
  if (response.status === 403) {
    throw new ExternalTokenError("insufficient_scope", {
      description: "Vantage API token requires read access",
      statusCode: 403,
      requiredScopes: ["read"],
    });
  }
  if (response.status !== 200) {
    const retryAfter = response.headers.get("Retry-After");
    throw new ExternalTokenError("temporarily_unavailable", {
      description: "Vantage token validation is temporarily unavailable",
      statusCode: 503,
      ...(retryAfter ? { headers: { "Retry-After": retryAfter } } : {}),
    });
  }

  // Service tokens have no user claims. Core remains authoritative for scopes
  // and resource permissions on every subsequent tool call.
  const path = new URL(request.url).pathname.startsWith("/sse") ? "/sse" : "/mcp";
  return {
    audience: new URL(path, request.url).href,
    props: { tokenSet: { accessToken: token } } satisfies Pick<UserProps, "tokenSet">,
  };
}
