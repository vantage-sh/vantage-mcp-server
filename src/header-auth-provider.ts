import type { ExecutionContext } from "@cloudflare/workers-types";

type HandlerWithFetch = {
	fetch(request: Request, env?: unknown, ctx?: ExecutionContext): Promise<Response>;
};

// These options mimic the OAuthProviderOptions from @cloudflare/workers-oauth-provider
export type HeaderAuthProviderOptions = {
	apiRoute: string | string[];
	defaultHandler: HandlerWithFetch;
	apiHandler: HandlerWithFetch;
};

export class HeaderAuthProvider {
	private options: HeaderAuthProviderOptions;

	constructor(options: HeaderAuthProviderOptions) {
		this.options = options;
	}

	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (this.matchesApiRoute(url)) {
			const authHeader = request.headers.get("authorization");
			const vantageHeaders = this.extractVantageHeaders(request);

			if (!authHeader || !authHeader.trim()) {
				if (Object.keys(vantageHeaders).length === 0) {
					return new Response("Unauthorized - Missing authorization header", {
						status: 401,
					});
				}
			} else {
				const bearerToken = this.extractBearerToken(authHeader);
				if (!bearerToken) {
					return new Response("Unauthorized - Invalid authorization header format", {
						status: 401,
					});
				}
			}

			// Create props with the bearer token (if present) and vantage headers
			// This structure matches the structure we construct in auth.ts and the
			// expected lookup location of token in tokenFromProps()
			const authHeaderProps: {
				vantageHeaders: Record<string, string>;
				tokenSet?: { accessToken: string; idToken: string; refreshToken: string };
			} = {
				vantageHeaders,
			};

			// Only add tokenSet if we have a valid auth header
			if (authHeader?.trim()) {
				const bearerToken = this.extractBearerToken(authHeader);
				if (bearerToken) {
					authHeaderProps.tokenSet = {
						accessToken: bearerToken,
					} as any;
				}
			}

			// @ts-expect-error: This seems fine
			ctx.props = {
				// @ts-expect-error: This works as a object
				...ctx.props,
				...authHeaderProps,
			};

			// Forward the request to the API handler, which is the VantageMCP server
			return this.options.apiHandler.fetch(request, env, ctx);
		}

		// Forward the request to default handler which is the Hono app
		return this.options.defaultHandler.fetch(request, env, ctx);
	}

	private matchesApiRoute(url: URL): boolean {
		const routes = Array.isArray(this.options.apiRoute)
			? this.options.apiRoute
			: [this.options.apiRoute];

		for (const route of routes) {
			if (route.startsWith("http")) {
				const routeUrl = new URL(route);
				if (
					url.hostname === routeUrl.hostname &&
					url.pathname.startsWith(routeUrl.pathname)
				) {
					return true;
				}
			} else {
				if (url.pathname.startsWith(route)) {
					return true;
				}
			}
		}

		return false;
	}

	private extractBearerToken(authHeader: string): string | null {
		const trimmed = authHeader.trim();
		if (trimmed.toLowerCase().startsWith("bearer ")) {
			return trimmed.slice(7); // Remove "Bearer " prefix
		}
		return null;
	}

	private extractVantageHeaders(request: Request): Record<string, string> {
		const vantageHeaders: Record<string, string> = {};

		for (const [key, value] of request.headers.entries()) {
			if (key.toLowerCase().startsWith("x-vantage-")) {
				vantageHeaders[key] = value;
			}
		}

		return vantageHeaders;
	}
}
