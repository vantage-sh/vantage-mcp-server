import {
  OAuthError,
  type OAuthHelpers,
  type TokenExchangeCallbackOptions,
  type TokenExchangeCallbackResult,
} from "@cloudflare/workers-oauth-provider";
import * as oauth from "oauth4webapi";
import type { AppEnv } from "../env";
import { getOidcConfig } from "./oidc";

/**
 * Token Exchange Callback
 *
 * This function handles the token exchange callback for the CloudflareOAuth Provider and allows us to then interact with the Upstream IdP (your Auth0 tenant)
 */
export async function tokenExchangeCallback(
  options: TokenExchangeCallbackOptions,
  auth0Env: Pick<AppEnv, "AUTH0_CLIENT_ID" | "AUTH0_CLIENT_SECRET" | "AUTH0_DOMAIN">,
  getOAuthHelpers: () => Pick<OAuthHelpers, "revokeGrant">
): Promise<TokenExchangeCallbackResult | undefined> {
  // During the Authorization Code Exchange, we want to make sure that the Access Token issued
  // by the MCP Server has the same TTL as the one issued by Auth0.
  if (options.grantType === "authorization_code") {
    return {
      accessTokenTTL: options.props.tokenSet.accessTokenTTL,
      newProps: {
        ...options.props,
      },
    };
  }

  if (options.grantType === "refresh_token") {
    const auth0RefreshToken = options.props.tokenSet.refreshToken;
    if (!auth0RefreshToken) {
      await getOAuthHelpers().revokeGrant(options.grantId, options.userId);
      throw new OAuthError("invalid_grant", { description: "Reauthorization is required" });
    }

    let refreshTokenResponse: oauth.TokenEndpointResponse;
    try {
      const { as, client, clientAuth } = await getOidcConfig({
        client_id: auth0Env.AUTH0_CLIENT_ID,
        client_secret: auth0Env.AUTH0_CLIENT_SECRET,
        issuer: `https://${auth0Env.AUTH0_DOMAIN}/`,
      });

      const response = await oauth.refreshTokenGrantRequest(as, client, clientAuth, auth0RefreshToken);
      refreshTokenResponse = await oauth.processRefreshTokenResponse(as, client, response);
    } catch (error) {
      if (error instanceof oauth.ResponseBodyError && error.error === "invalid_grant") {
        await getOAuthHelpers().revokeGrant(options.grantId, options.userId);
        throw new OAuthError("invalid_grant", { description: "Reauthorization is required" });
      }

      // Auth0's rate limits and outages must not invalidate an otherwise usable grant.
      const upstreamResponse =
        error instanceof oauth.ResponseBodyError
          ? error.response
          : error instanceof oauth.OperationProcessingError && "cause" in error && error.cause instanceof Response
            ? error.cause
            : undefined;
      if (
        (error instanceof oauth.ResponseBodyError &&
          ["server_error", "temporarily_unavailable"].includes(error.error)) ||
        upstreamResponse?.status === 429 ||
        (upstreamResponse && upstreamResponse.status >= 500) ||
        error instanceof TypeError
      ) {
        const retryAfter = upstreamResponse?.headers.get("Retry-After");
        throw new OAuthError("temporarily_unavailable", {
          description: "Authentication service is temporarily unavailable",
          statusCode: 503,
          ...(retryAfter ? { headers: { "Retry-After": retryAfter } } : {}),
        });
      }

      throw error;
    }

    // Store the new token set and claims.
    return {
      accessTokenTTL: refreshTokenResponse.expires_in,
      newProps: {
        ...options.props,
        claims: oauth.getValidatedIdTokenClaims(refreshTokenResponse) ?? options.props.claims,
        tokenSet: {
          accessToken: refreshTokenResponse.access_token,
          accessTokenTTL: refreshTokenResponse.expires_in,
          idToken: refreshTokenResponse.id_token ?? options.props.tokenSet.idToken,
          refreshToken: refreshTokenResponse.refresh_token || auth0RefreshToken,
        },
      },
    };
  }
}
