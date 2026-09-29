import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import * as oauth from "oauth4webapi";
import type { AppEnv } from "../env";
import { getOidcConfig } from "./oidc";
import type { Auth0AuthRequest, UserProps } from "./types";

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Auth0 after user authentication.
 * It exchanges the authorization code for tokens and completes the
 * authorization process.
 */
export async function callback(c: Context<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>) {
  // Parse the state parameter to extract transaction state and Auth0 state
  const stateParam = c.req.query("state") as string;
  if (!stateParam) {
    return c.text("Invalid state parameter", 400);
  }

  // Parse the Auth0 auth request from the transaction-specific cookie
  const cookieName = `auth0_req_${stateParam}`;
  const auth0AuthRequestCookie = getCookie(c, cookieName);
  if (!auth0AuthRequestCookie) {
    return c.text("Invalid transaction state or session expired", 400);
  }

  const auth0AuthRequest = JSON.parse(atob(auth0AuthRequestCookie)) as Auth0AuthRequest;

  // Clear the transaction cookie as it's no longer needed
  setCookie(c, cookieName, "", {
    maxAge: 0,
    path: "/",
  });

  const { as, client, clientAuth } = await getOidcConfig({
    client_id: c.env.AUTH0_CLIENT_ID,
    client_secret: c.env.AUTH0_CLIENT_SECRET,
    issuer: `https://${c.env.AUTH0_DOMAIN}/`,
  });

  // Perform the Code Exchange
  const params = oauth.validateAuthResponse(as, client, new URL(c.req.url), auth0AuthRequest.transactionState);
  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    new URL("/callback", c.req.url).href,
    auth0AuthRequest.codeVerifier
  );

  // Process the response
  const result = await oauth.processAuthorizationCodeResponse(as, client, response, {
    expectedNonce: auth0AuthRequest.nonce,
    requireIdToken: true,
  });

  // Get the claims from the id_token
  const claims = oauth.getValidatedIdTokenClaims(result);
  if (!claims) {
    return c.text("Received invalid id_token from Auth0", 400);
  }

  // Complete the authorization
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: {
      label: claims.name || claims.email || claims.sub,
    },
    props: {
      claims: claims,
      tokenSet: {
        accessToken: result.access_token,
        accessTokenTTL: result.expires_in,
        idToken: result.id_token,
        refreshToken: result.refresh_token,
      },
    } satisfies UserProps,
    request: auth0AuthRequest.mcpAuthRequest,
    revokeExistingGrants: false,
    scope: auth0AuthRequest.mcpAuthRequest.scope,
    userId: claims.sub!,
  });

  return Response.redirect(redirectTo);
}
