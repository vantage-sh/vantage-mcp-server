/*
Note that this code started from the examples at 
https://github.com/cloudflare/ai/tree/0150b265a4510123b545b4f988511bf0b63c6641/demos/remote-mcp-auth0 
*/
import { env } from "cloudflare:workers";
import type {
	AuthRequest,
	OAuthHelpers,
	TokenExchangeCallbackOptions,
	TokenExchangeCallbackResult,
} from "@cloudflare/workers-oauth-provider";
import axios from "axios";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { html, raw } from "hono/html";
import type { JWTPayload } from "jose";
import * as oauth from "oauth4webapi";

export type UserProps = {
	claims: JWTPayload;
	tokenSet: {
		accessToken: string;
		idToken: string;
		refreshToken: string;
	};
};

type Auth0AuthRequest = {
	mcpAuthRequest: AuthRequest;
	codeVerifier: string;
	codeChallenge: string;
	nonce: string;
	transactionState: string;
	consentToken: string;
};

// TODO pull from env
const APP_ENV: "development" | "production" = "development";

export async function getOidcConfig({
	issuer,
	client_id,
	client_secret,
}: {
	issuer: string;
	client_id: string;
	client_secret: string;
}) {
	const as = await oauth
		.discoveryRequest(new URL(issuer), { algorithm: "oidc" })
		.then((response) => oauth.processDiscoveryResponse(new URL(issuer), response));

	const client: oauth.Client = { client_id };
	const clientAuth = oauth.ClientSecretPost(client_secret);

	return { as, client, clientAuth };
}

export interface RequiredEnv {
	VANTAGE_API_HOST: string;
	VANTAGE_MCP_TOKEN: string;
	AUTH0_CLIENT_ID: string;
	AUTH0_CLIENT_SECRET: string;
	AUTH0_DOMAIN: string;
	AUTH0_SCOPE: string;
	AUTH0_AUDIENCE: string;
	SELF_CALLBACK_URL: string;
	SENTRY_DSN: string;
	CF_VERSION_METADATA: { id: string };
}

/**
 * OAuth Authorization Endpoint
 *
 * This route initiates the Authorization Code Flow when a user wants to log in.
 * It creates a random state parameter to prevent CSRF attacks and stores the
 * original request information in a state-specific cookie for later retrieval.
 * Then it shows a consent screen before redirecting to Auth0.
 */
export async function authorize(
	c: Context<{ Bindings: RequiredEnv & { OAUTH_PROVIDER: OAuthHelpers } }>
) {
	const mcpClientAuthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	if (!mcpClientAuthRequest.clientId) {
		return c.text("Invalid request", 400);
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
	setCookie(c, cookieName, btoa(JSON.stringify(auth0AuthRequest)), {
		httpOnly: true,
		maxAge: 60 * 60 * 1,
		path: "/",
		sameSite: APP_ENV === "production" ? "none" : "lax",
		secure: APP_ENV === "production", // 1 hour
	});

	// Extract client information for the consent screen
	const clientName = client.clientName || client.clientId;
	const clientLogo = client.logoUri || ""; // No default logo
	const clientUri = client.clientUri || "#";
	const requestedScopes = (c.env.AUTH0_SCOPE || "").split(" ");

	// Render the consent screen with CSRF protection
	return c.html(
		renderConsentScreen({
			clientLogo,
			clientName,
			clientUri,
			consentToken,
			redirectUri: mcpClientAuthRequest.redirectUri,
			requestedScopes,
			transactionState,
		})
	);
}

/**
 * Consent Confirmation Endpoint
 *
 * This route handles the consent confirmation before redirecting to Auth0
 */
export async function confirmConsent(
	c: Context<{ Bindings: RequiredEnv & { OAUTH_PROVIDER: OAuthHelpers } }>
) {
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

async function getSSOLoginUrl(ssoEmail: string, env: RequiredEnv): Promise<string> {
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

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Auth0 after user authentication.
 * It exchanges the authorization code for tokens and completes the
 * authorization process.
 */
export async function callback(
	c: Context<{ Bindings: RequiredEnv & { OAUTH_PROVIDER: OAuthHelpers } }>
) {
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
	const params = oauth.validateAuthResponse(
		as,
		client,
		new URL(c.req.url),
		auth0AuthRequest.transactionState
	);
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
		} as UserProps,
		request: auth0AuthRequest.mcpAuthRequest,
		scope: auth0AuthRequest.mcpAuthRequest.scope,
		userId: claims.sub!,
	});

	return Response.redirect(redirectTo);
}

/**
 * Token Exchange Callback
 *
 * This function handles the token exchange callback for the CloudflareOAuth Provider and allows us to then interact with the Upstream IdP (your Auth0 tenant)
 */
export async function tokenExchangeCallback(
	options: TokenExchangeCallbackOptions
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
			throw new Error("No Auth0 refresh token found");
		}

		const { as, client, clientAuth } = await getOidcConfig({
			client_id: (env as RequiredEnv).AUTH0_CLIENT_ID,
			client_secret: (env as RequiredEnv).AUTH0_CLIENT_SECRET,
			issuer: `https://${(env as RequiredEnv).AUTH0_DOMAIN}/`,
		});

		// Perform the refresh token exchange with Auth0.
		const response = await oauth.refreshTokenGrantRequest(
			as,
			client,
			clientAuth,
			auth0RefreshToken
		);
		const refreshTokenResponse = await oauth.processRefreshTokenResponse(as, client, response);

		// Get the claims from the id_token
		const claims = oauth.getValidatedIdTokenClaims(refreshTokenResponse);
		if (!claims) {
			throw new Error("Received invalid id_token from Auth0");
		}

		// Store the new token set and claims.
		return {
			accessTokenTTL: refreshTokenResponse.expires_in,
			newProps: {
				...options.props,
				claims: claims,
				tokenSet: {
					accessToken: refreshTokenResponse.access_token,
					accessTokenTTL: refreshTokenResponse.expires_in,
					idToken: refreshTokenResponse.id_token,
					refreshToken: refreshTokenResponse.refresh_token || auth0RefreshToken,
				},
			},
		};
	}
}

/**
 * Renders the consent screen HTML
 */
export function renderConsentScreen({
	clientName,
	// clientLogo, // TODO: Implement logo display
	// clientUri, // TODO: Implement client URI display
	redirectUri,
	requestedScopes,
	transactionState,
	consentToken,
}: {
	clientName: string;
	clientLogo: string;
	clientUri: string;
	redirectUri: string;
	requestedScopes: string[];
	transactionState: string;
	consentToken: string;
}) {
	return html`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Authorization Request</title>
                <style>
                    :root {
                        --primary-color: #872EE1;
                        --text-color: #333;
                        --background-color: #f7f7f7;
                        --card-background: #ffffff;
                        --border-color: #e0e0e0;
                        --danger-color: #ef233c;
                        --success-color: #2a9d8f;
                        --font-family:
                            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue',
                            sans-serif;
                    }

                    body {
                        font-family: var(--font-family);
                        background-color: var(--background-color);
                        color: var(--text-color);
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }

                    .container {
                        width: 100%;
                        max-width: 480px;
                        padding: 20px;
                    }

                    .card {
                        background-color: var(--card-background);
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        padding: 32px;
                        overflow: hidden;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 24px;
                    }

                    h1 {
                        font-size: 20px; 
                    }

                    .app-link {
                        color: var(--primary-color);
                        text-decoration: none;
                        font-size: 14px;
                    }

                    .app-link:hover {
                        text-decoration: underline;
                    }

                    .description {
                        margin: 24px 0;
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    .description:first-of-type {
                        margin: 0 0 24px 0;
                    }

                    .scopes {
                        background-color: var(--background-color);
                        border-radius: 8px;
                        padding: 16px;
                        margin: 24px 0;
                    }

                    .scope-title {
                        font-weight: 600;
                        margin-bottom: 8px;
                        font-size: 15px;
                    }

                    .scope-list {
                        font-size: 16px;
                        margin: 0;
                        padding-left: 20px;
                    }

                    .actions {
                        display: flex;
                        gap: 12px;
                        margin-top: 24px;
                    }

                    .btn {
                        flex: 1;
                        padding: 12px 20px;
                        font-size: 16px;
                        font-weight: 500;
                        border-radius: 8px;
                        cursor: pointer;
                        border: none;
                        transition: all 0.2s ease;
                    }

                    input[type="text"].btn {
                        cursor: auto;
                        border-radius: 0px;
                    }

                    .btn-cancel {
                        background-color: transparent;
                        border: 1px solid var(--border-color);
                        color: var(--text-color);
                    }

                    .btn-cancel:hover {
                        background-color: rgba(0, 0, 0, 0.05);
                    }

                    .btn-approve {
                        color:  var(--background-color);
                        border-radius: 6px;
                        border: 0px solid var(--primary-color);
                        background: var(--primary-color);
                    }

                    .btn-approve:hover {
                        background: var(--primary-color);
                    }

                    .security-note {
                        margin-top: 24px;
                        font-size: 12px;
                        color: #777;
                        text-align: center;
                    }

                    @media (max-width: 520px) {
                        .container {
                            padding: 10px;
                        }

                        .card {
                            padding: 24px;
                            border-radius: 8px;
                        }
                    }

                    .app-logo {
                        width: 40px;
                        height: 40px;
                        object-fit: contain;
                        border-radius: 8px;
                        
                    }
                    .app-logo-mcp {
                        width: 24px;
                        height: 24px;
                        object-fit: contain;
                        border-radius: 8px;
                        padding: 8px;
                    }
                    .app-logo.shadow, .app-logo-mcp.shadow {
                        border-radius: 80px;
                        background: var(--background-color, #FFF);
                        box-shadow: 0px 5px 12px 0px rgba(0, 0, 0, 0.10);
                    }
                    .img-container {
                        display: inline-block;
                        margin: 0 8px;
                    }
                    .mb-8 {
                        margin-bottom: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h1>Vantage Hosted MCP Server<br>Authorization Request</h1>
                        </div>
                        <div class="header">
                            <span class="img-container">
                                <img src="/vantage-logo.svg" alt="Vantage logo" class="shadow app-logo" />
                            </span>
                            <img src="/line.svg" alt="line" class="app-logo" />
                            <span class="img-container">
                                <img src="/mcp-logo.png" alt="Model Context Protocol logo" class="shadow app-logo-mcp" />
                            </span>
                        </div>

                        <p class="description">
                            <strong>${clientName}</strong> is requesting permission to access the <strong>Vantage API</strong> using your
                            account. Please review the permissions before proceeding.
                        </p>

                        <p class="description mb-8">
                            By clicking "Allow Access", you authorize <strong>${clientName}</strong> to access the following resources:
                        </p>

                        <ul class="scope-list">
                            ${raw(requestedScopes.map((scope) => `<li>${scope}</li>`).join("\n"))}
                        </ul>

                        <p class="description">
                            If you did not initiate the request coming from <strong>${clientName}</strong> (<i>${redirectUri}</i>) or you do
                            not trust this application, you should deny access.
                        </p>

                        <form method="POST" action="/authorize/consent">
                            <input type="hidden" name="transaction_state" value="${transactionState}" />
                            <input type="hidden" name="consent_token" value="${consentToken}" />

                            <div class="actions">
                                <button type="submit" name="consent_action" value="deny" class="btn btn-cancel">Deny Access</button>
                                <button type="submit" name="consent_action" value="approve" class="btn btn-approve">Allow Access</button>
                            </div>
                        </form>

                        <p class="description">
                            Users that access Vantage through their SSO provider, please provide your email address below:
                        </p>

                        <form method="POST" action="/authorize/consent">
                            <input type="hidden" name="transaction_state" value="${transactionState}" />
                            <input type="hidden" name="consent_token" value="${consentToken}" />
                            
                            <div class="actions">
                                <input type="text" name="sso_email" placeholder="SSO Login Email" class="btn btn-cancel" required>
                                <button type="submit" name="consent_action" value="approve-sso" class="btn btn-approve">Allow SSO</button>
                            </div>
                        </form>

                        <p class="security-note">
                            You're signing in to a third-party application. Your account information is never shared without your
                            permission.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    `;
}
