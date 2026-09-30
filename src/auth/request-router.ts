type FetchHandler<Env> = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
};

type AuthContext = ExecutionContext & {
  props?: { vantageHeaders?: Record<string, string> };
};

const AGENT_DELEGATION_HEADER = "X-Vantage-Agent-Delegation";

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function createAuthRouter<Env>(
  oauthProvider: FetchHandler<Env>,
  mcpHandler: FetchHandler<Env>,
  sseHandler: FetchHandler<Env>
): FetchHandler<Env> {
  return {
    fetch(request, env, ctx) {
      // A bearer credential always belongs to the OAuth provider, even when
      // an agent header is also present or the Authorization value is malformed.
      if (request.headers.has("Authorization")) {
        return oauthProvider.fetch(request, env, ctx);
      }

      const pathname = new URL(request.url).pathname;
      const apiHandler = matchesRoute(pathname, "/mcp")
        ? mcpHandler
        : matchesRoute(pathname, "/sse")
          ? sseHandler
          : undefined;
      if (!apiHandler) {
        return oauthProvider.fetch(request, env, ctx);
      }

      const delegationToken = request.headers.get(AGENT_DELEGATION_HEADER);
      if (!delegationToken?.trim()) {
        return oauthProvider.fetch(request, env, ctx);
      }

      const authContext = ctx as AuthContext;
      authContext.props = {
        ...authContext.props,
        vantageHeaders: { [AGENT_DELEGATION_HEADER]: delegationToken },
      };
      return apiHandler.fetch(request, env, ctx);
    },
  };
}
