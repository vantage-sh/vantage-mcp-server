import type { OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import type { AppEnv } from "../env";

/**
 * Pin discovery to trusted deployment configuration, including requests on the
 * production alias. Enabling this also enforces exact token audiences.
 */
export function resourceMetadataOptions(
  env: Pick<AppEnv, "SELF_CALLBACK_URL" | "MCP_OAUTH_METADATA_ENABLED">
): Pick<OAuthProviderOptions, "clientIdMetadataDocumentEnabled" | "resourceMetadata"> {
  if (env.MCP_OAUTH_METADATA_ENABLED !== "true") return {};

  const origin = new URL(env.SELF_CALLBACK_URL).origin;
  return {
    clientIdMetadataDocumentEnabled: origin.startsWith("https:"),
    resourceMetadata: {
      resource: new URL("/mcp", origin).href,
      // The provider permits local HTTP discovery only via its default issuer.
      ...(origin.startsWith("https:") ? { authorization_servers: [origin] } : {}),
      bearer_methods_supported: ["header"],
      resource_name: "Vantage Hosted MCP Server",
    },
  };
}

/** Move the legacy production hostname before exact audience checks run. */
export function canonicalOAuthRedirect(
  request: Request,
  env: Pick<AppEnv, "ENVIRONMENT" | "SELF_CALLBACK_URL" | "MCP_OAUTH_METADATA_ENABLED">
): Response | undefined {
  if (env.MCP_OAUTH_METADATA_ENABLED !== "true" || env.ENVIRONMENT !== "production") return;
  const url = new URL(request.url);
  const canonical = new URL(env.SELF_CALLBACK_URL);
  if (url.origin !== "https://hosted-mcp-prod.vantage.sh" || url.origin === canonical.origin) return;
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  return Response.redirect(url.href, 308);
}
