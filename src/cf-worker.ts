import OAuthProvider, { type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as Sentry from "@sentry/cloudflare";
import { McpAgent } from "agents/mcp";
import { Hono } from "hono";
import {
	authorize,
	callback,
	confirmConsent,
	type RequiredEnv,
	tokenExchangeCallback,
	type UserProps,
} from "./auth";
import { HeaderAuthProvider } from "./header-auth-provider";
import homepage from "./homepage";
import setupRegisteredResources from "./resources";
import { callApi, serverMeta } from "./shared";
import { type AllowedMethods, setupRegisteredTools } from "./tools/structure/registerTool";

// Side effect import to register all tools
import "./tools";

function tokenFromProps(props: UserProps, env?: RequiredEnv): string {
	// Check if VANTAGE_MCP_TOKEN is provided in environment
	if (env?.VANTAGE_MCP_TOKEN) {
		return env.VANTAGE_MCP_TOKEN;
	}

	const token = props?.tokenSet?.accessToken;
	if (!token) {
		throw new Error("Access token is not available in given props.");
	}
	return token;
}

export class VantageMCP extends McpAgent<Env, Record<string, never>, UserProps> {
	server = new McpServer(serverMeta);
	env: Env;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.env = env;
	}

	async callVantageApi(
		endpoint: string,
		params: Record<string, unknown>,
		method: AllowedMethods
	): Promise<{ data: unknown; ok: true } | { errors: unknown[]; ok: false }> {
		const vantageHeaders =
			(this.props as UserProps & { vantageHeaders?: Record<string, string> })
				?.vantageHeaders || {};

		// Try to get token, but don't fail if not available (when using vantage headers only)
		let token: string | null = null;
		try {
			token = tokenFromProps(this.props!, this.env as RequiredEnv);
		} catch (_error) {
			// If no token is available, we'll rely on vantage headers for authentication
			if (Object.keys(vantageHeaders).length === 0) {
				throw new Error(
					"No authentication method available - missing both token and vantage headers"
				);
			}
		}

		const headers: Record<string, string> = {
			...vantageHeaders,
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		return callApi(
			(this.env as RequiredEnv).VANTAGE_API_HOST,
			headers,
			params,
			method,
			endpoint
		);
	}

	async init() {
		setupRegisteredTools(this.server, () => this);
		setupRegisteredResources(this.server);
	}
}

// Initialize the Hono app with the routes for the OAuth Provider.
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", authorize);
app.post("/authorize/consent", confirmConsent);
app.get("/callback", callback);

app.get("/", (ctx) => {
	return ctx.html(homepage());
});

function hasValidAuthHeader(request: Request): boolean {
	const authHeader = request.headers.get("authorization");
	return !!(authHeader?.trim() && authHeader.indexOf("Bearer vntg_tkn") === 0);
}

function hasVantageHeaders(request: Request): boolean {
	for (const [key] of request.headers.entries()) {
		if (key.toLowerCase().startsWith("x-vantage-")) {
			return true;
		}
	}
	return false;
}

function createMcpServer(request: Request, sse: boolean): HeaderAuthProvider | OAuthProvider {
	if (hasVantageHeaders(request) || hasValidAuthHeader(request)) {
		// Vantage headers or token is passed through headers, use HeaderAuthProvider
		// Can be used when programmatically accessing the server
		return new HeaderAuthProvider({
			apiHandler: sse ? VantageMCP.mount("/sse") : VantageMCP.serve("/mcp"),
			apiRoute: sse ? "/sse" : "/mcp",
			// @ts-expect-error
			defaultHandler: app,
		});
	} else {
		// OAuth mode - use the full OAuth provider setup
		return new OAuthProvider({
			apiHandler: sse ? VantageMCP.mount("/sse") : VantageMCP.serve("/mcp"),
			apiRoute: sse ? "/sse" : "/mcp",
			authorizeEndpoint: "/authorize",
			clientRegistrationEndpoint: "/register",
			// @ts-expect-error
			defaultHandler: app,
			tokenEndpoint: "/token",
			tokenExchangeCallback,
		});
	}
}

export default {
	async fetch(request: Request, env: RequiredEnv, ctx: ExecutionContext) {
		const sse = new URL(request.url).pathname.startsWith("/sse");
		if (env.VANTAGE_MCP_TOKEN) {
			// Direct token mode - bypass OAuth and serve MCP directly
			// Can be used for easy local development or for MCP clients without
			// OAuth support or the ability to pass headers.
			if (sse) {
				return VantageMCP.mount("/sse").fetch(request, env, ctx);
			}
			return VantageMCP.serve("/mcp").fetch(request, env, ctx);
		}

		const mcpServer = createMcpServer(request, sse);

		const sentryHandler = Sentry.withSentry((env: RequiredEnv) => {
			const { id: versionId } = env.CF_VERSION_METADATA;
			return {
				dsn: env.SENTRY_DSN,
				release: versionId,
				// Adds request headers and IP for users, for more info visit:
				// https://docs.sentry.io/platforms/javascript/guides/cloudflare/configuration/options/#sendDefaultPii
				sendDefaultPii: true,

				// Set tracesSampleRate to 1.0 to capture 100% of spans for tracing.
				// Learn more at
				// https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
				tracesSampleRate: 1.0,
			};
		}, mcpServer);

		return sentryHandler.fetch!(request as any, env, ctx);
	},
};
