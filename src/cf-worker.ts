import OAuthProvider, {
  getOAuthApi,
  type OAuthHelpers,
  type OAuthProviderOptions,
} from "@cloudflare/workers-oauth-provider";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as Sentry from "@sentry/cloudflare";
import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import { McpAgent } from "agents/mcp";
import { Hono } from "hono";
import { authorize, callback, confirmConsent, tokenExchangeCallback, type UserProps } from "./auth";
import {
  claimsUnrecognisedBrand,
  describeRedirectTarget,
  isRecognisedClient,
  validateClientRegistration,
} from "./auth/client-policy";
import { createAuthRouter } from "./auth/request-router";
import { callCoreApi, coreApiHeaders } from "./core-api";
import type { AppEnv } from "./env";
import homepage from "./homepage";
import { logger } from "./logger";
import { withStatelessMcp } from "./mcp/stateless";
import setupRegisteredResources from "./resources";
import { serverMeta } from "./shared";
import { createHostedMcpServer } from "./sse-deprecation";
import { hideAccessPolicyToolsFromNonOwners } from "./tools/access-policies/gating";
import { setupRegisteredTools } from "./tools/structure/registerTool";
import { tracer } from "./tracing";

// Side effect import to register all tools
import "./tools";

export class VantageMCP extends McpAgent<Env, Record<string, never>, UserProps> {
  // Created in init(), before McpAgent connects the transport.
  server!: McpServer;
  env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
  }

  async callVantageApi<
    P extends Path,
    M extends SupportedMethods<P>,
    Request extends RequestBodyForPathAndMethod<P, M>,
    Response extends ResponseBodyForPathAndMethod<P, M>,
  >(
    endpoint: P,
    params: Request,
    method: M,
    signal?: AbortSignal
  ): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> {
    const headers = coreApiHeaders(this.props, this.env);
    if (!headers) {
      throw new Error("No authentication method available - missing both token and vantage headers");
    }
    return callCoreApi<P, M, Request, Response>(
      this.env,
      headers,
      this.server.server.getClientVersion(),
      endpoint,
      params,
      method,
      signal
    );
  }

  async init() {
    this.server = createHostedMcpServer(serverMeta, {
      transportType: this.getTransportType(),
      mcpUrl: new URL("/mcp", this.env.SELF_CALLBACK_URL).href,
      storage: this.ctx.storage,
      waitUntil: (promise) => this.ctx.waitUntil(promise),
    });
    const ctx = {
      env: this.env,
      waitUntil: (promise: Promise<unknown>) => this.ctx.waitUntil(promise),
      callVantageApi: this.callVantageApi.bind(this),
    };
    const tools = setupRegisteredTools(this.server, () => ctx);
    setupRegisteredResources(this.server);
    await hideAccessPolicyToolsFromNonOwners(tools, ctx);
  }
}

// Initialize the Hono app with the routes for the OAuth Provider.
const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", authorize);
app.post("/authorize/consent", confirmConsent);
app.get("/callback", callback);

app.get("/", (ctx) => {
  return ctx.html(homepage());
});

type ApiHandler = {
  fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Response | Promise<Response>;
};

const mcpHandler = withStatelessMcp(VantageMCP.serve("/mcp") as unknown as ApiHandler);
const sseHandler = VantageMCP.mount("/sse") as unknown as ApiHandler;

function createMcpServer(env: AppEnv): OAuthProvider<AppEnv> {
  const oauthOptions: OAuthProviderOptions<AppEnv> = {
    // Direct Vantage API bearer tokens are retired. Only provider-issued
    // tokens reach these API handlers; agent headers use the narrow pre-router.
    apiHandlers: { "/mcp": mcpHandler, "/sse": sseHandler },
    authorizeEndpoint: "/authorize",
    clientRegistrationCallback: ({ clientMetadata }) => {
      const description = validateClientRegistration(clientMetadata);
      const redirectUris = Array.isArray(clientMetadata.redirect_uris)
        ? clientMetadata.redirect_uris.filter((u): u is string => typeof u === "string")
        : [];
      const clientName = typeof clientMetadata.client_name === "string" ? clientMetadata.client_name : undefined;
      // Attacker-controlled input: log the name truncated and only redirect hosts, never full URIs.
      logger
        .withTags({
          oauth_client_name: clientName?.slice(0, 100),
          oauth_client_recognised: isRecognisedClient(clientName, redirectUris),
          oauth_redirect_hosts: redirectUris.map(describeRedirectTarget).join(","),
          oauth_registration_outcome: description ? "rejected" : "accepted",
          oauth_registration_reason:
            description ??
            (claimsUnrecognisedBrand(clientName, redirectUris) ? "brand_name_unrecognised_redirect" : undefined),
        })
        .info("OAuth client registration");
      if (description) {
        return { code: "invalid_client_metadata", description };
      }
    },
    clientRegistrationTTL: undefined,
    clientRegistrationEndpoint: "/register",
    defaultHandler: app,
    onError: ({ code, description, headers, internal, status }) => {
      const tags = {
        oauth_error_code: code,
        oauth_error_status: status,
        oauth_error_category: internal?.category,
        oauth_error_reason: internal?.reason,
      };
      logger.withTags(tags).error("OAuth error response", description);
      Sentry.captureMessage("OAuth error response", {
        level: "error",
        tags,
        extra: {
          description,
          headers,
          internal,
        },
      });
    },
    refreshTokenTTL: undefined,
    tokenEndpoint: "/token",
    tokenExchangeCallback: (options) => tokenExchangeCallback(options, env, () => getOAuthApi(oauthOptions, env)),
  };
  return new OAuthProvider<AppEnv>(oauthOptions);
}

// Forwards the Worker span's W3C traceparent onto the request so downstream
// handlers (the Durable Object, which reads `extra.requestInfo.headers`) can
// chain their spans under it.
function withActiveTrace(request: Request): Request {
  const traceHeaders = tracer.getTraceHeaders();
  if (!traceHeaders) return request;

  const headers = new Headers(request.headers);
  headers.set("traceparent", traceHeaders.traceparent);
  if (traceHeaders.tracestate) {
    headers.set("tracestate", traceHeaders.tracestate);
  }
  return new Request(request, { headers });
}

const fetchHandler = async (request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> => {
  const tracedRequest = withActiveTrace(request);
  const sse = new URL(tracedRequest.url).pathname.startsWith("/sse");
  if (env.VANTAGE_MCP_TOKEN) {
    // Preserve the local development override, which bypasses OAuth.
    return (sse ? sseHandler : mcpHandler).fetch(tracedRequest, env, ctx);
  }

  const oauthProvider = createMcpServer(env);
  const authRouter = createAuthRouter(oauthProvider, mcpHandler, sseHandler);

  const sentryHandler = Sentry.withSentry((env: AppEnv) => {
    const { id: versionId } = env.CF_VERSION_METADATA;
    return {
      dsn: env.SENTRY_DSN,
      release: versionId,
      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/cloudflare/configuration/options/#sendDefaultPii
      sendDefaultPii: false,

      // Set tracesSampleRate to 1.0 to capture 100% of spans for tracing.
      // Learn more at
      // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
      tracesSampleRate: 1.0,
    };
  }, authRouter);

  return sentryHandler.fetch!(tracedRequest as any, env, ctx);
};

export default {
  fetch: tracer.wrapFetchHandler<AppEnv>(fetchHandler),
};
