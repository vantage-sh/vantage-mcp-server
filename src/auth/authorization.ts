import { AuthorizationError, type AuthRequest, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import axios from "axios";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import * as oauth from "oauth4webapi";
import type { AppEnv } from "../env";
import { logger } from "../logger";
import { isLegacySseResource } from "../sse-deprecation";
import { describeRedirectTarget, isLoopbackRedirect, isRecognisedClient } from "./client-policy";
import { renderConsentScreen } from "./consent-screen";
import { getOidcConfig } from "./oidc";
import type { Auth0AuthRequest } from "./types";

/**
 * OAuth Authorization Endpoint
 *
 * This route initiates the Authorization Code Flow when a user wants to log in.
 * It creates a random state parameter to prevent CSRF attacks and stores the
 * original request information in a state-specific cookie for later retrieval.
 * Then it shows a consent screen before redirecting to Auth0.
 */
export async function authorize(c: Context<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>) {
  let mcpClientAuthRequest: AuthRequest;
  try {
    mcpClientAuthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      throw error;
    }

    if (!error.redirectUri) {
      return c.text(error.description, 400);
    }

    const redirectUri = new URL(error.redirectUri);
    redirectUri.searchParams.set("error", error.code);
    redirectUri.searchParams.set("error_description", error.description);
    if (error.state) {
      redirectUri.searchParams.set("state", error.state);
    }
    if (error.issuer) {
      redirectUri.searchParams.set("iss", error.issuer);
    }
    return c.redirect(redirectUri.toString());
  }

  const client = await c.env.OAUTH_PROVIDER.lookupClient(mcpClientAuthRequest.clientId);
  if (!client) {
    return c.text("Invalid client", 400);
  }

  // Generate all that is needed for the Auth0 auth request
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const transactionState = oauth.generateRandomState();
  const consentToken = oauth.generateRandomState(); // For CSRF protection on consent form

  // We will persist everything in a cookie.
  const auth0AuthRequest: Auth0AuthRequest = {
    codeChallenge: await oauth.calculatePKCECodeChallenge(codeVerifier),
    codeVerifier,
    consentToken,
    mcpAuthRequest: mcpClientAuthRequest,
    nonce: oauth.generateRandomNonce(),
    transactionState,
  };

  // Store the auth request in a transaction-specific cookie
  const cookieName = `auth0_req_${transactionState}`;
  const isHostedEnvironment = c.env.ENVIRONMENT !== "development";
  setCookie(c, cookieName, btoa(JSON.stringify(auth0AuthRequest)), {
    httpOnly: true,
    maxAge: 60 * 60 * 1,
    path: "/",
    sameSite: isHostedEnvironment ? "none" : "lax",
    secure: isHostedEnvironment,
  });

  // Extract client information for the consent screen
  const clientName = client.clientName || client.clientId;
  const clientLogo = client.logoUri || ""; // No default logo
  const clientUri = client.clientUri || "#";
  const requestedScopes = (c.env.AUTH0_SCOPE || "").split(" ");

  const recognised = isRecognisedClient(client.clientName, client.redirectUris ?? []);
  const redirectHost = describeRedirectTarget(mcpClientAuthRequest.redirectUri);
  logger
    .withTags({
      oauth_client_name: clientName.slice(0, 100),
      oauth_client_recognised: recognised,
      oauth_redirect_hosts: redirectHost,
    })
    .info("OAuth consent shown");

  // Render the consent screen with CSRF protection
  return c.html(
    renderConsentScreen({
      clientLogo,
      clientName,
      clientUri,
      consentToken,
      isLoopbackRedirect: isLoopbackRedirect(mcpClientAuthRequest.redirectUri),
      isRecognisedClient: recognised,
      redirectHost,
      redirectUri: mcpClientAuthRequest.redirectUri,
      requestedScopes,
      sseMigrationUrl: isLegacySseResource(mcpClientAuthRequest.resource, c.req.url)
        ? new URL("/mcp", c.req.url).href
        : undefined,
      transactionState,
    })
  );
}

/**
 * Consent Confirmation Endpoint
 *
 * This route handles the consent confirmation before redirecting to Auth0
 */
export async function confirmConsent(c: Context<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>) {
  // Get form data
  const formData = await c.req.formData();
  const transactionState = formData.get("transaction_state") as string;
  const consentToken = formData.get("consent_token") as string;
  const consentAction = formData.get("consent_action") as string;

  // Validate the transaction state
  if (!transactionState) {
    return c.text("Invalid transaction state", 400);
  }

  // Get the transaction-specific cookie
  const cookieName = `auth0_req_${transactionState}`;
  const auth0AuthRequestCookie = getCookie(c, cookieName);
  if (!auth0AuthRequestCookie) {
    return c.text("Invalid or expired transaction", 400);
  }

  // Parse the Auth0 auth request from the cookie
  const auth0AuthRequest = JSON.parse(atob(auth0AuthRequestCookie)) as Auth0AuthRequest;

  // Validate the CSRF token
  if (auth0AuthRequest.consentToken !== consentToken) {
    return c.text("Invalid consent token", 403);
  }

  const formGivesConsent = consentAction === "approve" || consentAction === "approve-sso";

  // Handle user denial
  if (!formGivesConsent) {
    // Parse the MCP client auth request to get the original redirect URI
    const redirectUri = new URL(auth0AuthRequest.mcpAuthRequest.redirectUri);

    // Add error parameters to the redirect URI
    redirectUri.searchParams.set("error", "access_denied");
    redirectUri.searchParams.set("error_description", "User denied the request");
    if (auth0AuthRequest.mcpAuthRequest.state) {
      redirectUri.searchParams.set("state", auth0AuthRequest.mcpAuthRequest.state);
    }
    if (auth0AuthRequest.mcpAuthRequest.issuer) {
      redirectUri.searchParams.set("iss", auth0AuthRequest.mcpAuthRequest.issuer);
    }

    // Clear the transaction cookie
    setCookie(c, cookieName, "", {
      maxAge: 0,
      path: "/",
    });

    return c.redirect(redirectUri.toString());
  }

  const { as } = await getOidcConfig({
    client_id: c.env.AUTH0_CLIENT_ID,
    client_secret: c.env.AUTH0_CLIENT_SECRET,
    issuer: `https://${c.env.AUTH0_DOMAIN}/`,
  });

  // Redirect to Auth0's authorization endpoint
  const authorizationLoginEndpoint =
    consentAction === "approve-sso"
      ? await getSSOLoginUrl(formData.get("sso_email") as string, c.env)
      : as.authorization_endpoint!;
  const authorizationUrl = new URL(authorizationLoginEndpoint);
  if (consentAction === "approve-sso") {
    authorizationUrl.host = c.env.AUTH0_DOMAIN;
  }
  authorizationUrl.searchParams.set("client_id", c.env.AUTH0_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", c.env.SELF_CALLBACK_URL);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("audience", c.env.AUTH0_AUDIENCE);
  authorizationUrl.searchParams.set("scope", c.env.AUTH0_SCOPE);
  authorizationUrl.searchParams.set("code_challenge", auth0AuthRequest.codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("nonce", auth0AuthRequest.nonce);
  authorizationUrl.searchParams.set("state", transactionState);
  return c.redirect(authorizationUrl.href);
}

async function getSSOLoginUrl(ssoEmail: string, env: AppEnv): Promise<string> {
  const requestOptions = {
    url: `${env.VANTAGE_API_HOST}/internal/email_identity_provider`,
    method: "GET",
    params: {
      email: ssoEmail,
      callback_url: env.SELF_CALLBACK_URL,
      scope: env.AUTH0_SCOPE,
    },
  };

  const apiResult = await axios(requestOptions);

  if (apiResult.status !== 200) {
    throw new Error(`Failed to get Auth0 connection for ${ssoEmail}: ${apiResult.statusText}`);
  }
  const location = apiResult.data?.location;
  if (!location) {
    throw new Error(`No location found in Auth0 connection response for ${ssoEmail}`);
  }
  return location;
}
