import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as LegacyTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import * as oauth from "oauth4webapi";
import { afterEach, expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/env";
import { selectMcpApiHandler, statelessMcpHandler } from "../../src/mcp/stateless";

afterEach(() => vi.unstubAllGlobals());

function executionContext(props: unknown = {}) {
  return { props, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
}

function makeKv() {
  const values = new Map<string, string>();
  return {
    async get(key: string, options?: { type?: string }) {
      const value = values.get(key);
      return options?.type === "json" && value ? JSON.parse(value) : (value ?? null);
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
    async list(options?: { prefix?: string }) {
      return {
        keys: [...values.keys()].filter((key) => key.startsWith(options?.prefix ?? "")).map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
}

function authFixture() {
  const env = {
    VANTAGE_API_HOST: "https://api.example",
    ENVIRONMENT: "staging",
    OAUTH_KV: makeKv(),
  } as unknown as AppEnv;
  const options: OAuthProviderOptions<AppEnv> = {
    apiRoute: "/mcp",
    apiHandler: statelessMcpHandler,
    defaultHandler: { fetch: () => new Response("Not found", { status: 404 }) },
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/token",
  };
  const provider = new OAuthProvider(options);
  const helpers = getOAuthApi(options, env);
  async function issueToken(upstreamToken: string) {
    const client = await helpers.createClient({
      redirectUris: ["http://localhost/callback"],
      tokenEndpointAuthMethod: "none",
    });
    const verifier = "v".repeat(43);
    const { redirectTo } = await helpers.completeAuthorization({
      metadata: {},
      userId: upstreamToken,
      revokeExistingGrants: false,
      scope: [],
      props: { claims: { sub: upstreamToken }, tokenSet: { accessToken: upstreamToken } },
      request: {
        clientId: client.clientId,
        codeChallenge: await oauth.calculatePKCECodeChallenge(verifier),
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost/callback",
        responseType: "code",
        scope: [],
        state: "test",
      },
    });
    const response = await provider.fetch(
      new Request("https://mcp.example/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: client.clientId,
          code: new URL(redirectTo).searchParams.get("code")!,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: "http://localhost/callback",
        }),
      }),
      env,
      executionContext()
    );
    expect(response.status).toBe(200);
    return ((await response.json()) as { access_token: string }).access_token;
  }
  return { env, provider, issueToken };
}

it("keeps stateless routing off by default and retains SSE, refusing unsupported requested confirmations", async () => {
  const legacy = { fetch: vi.fn(() => new Response("legacy")) };
  for (const [sse, env] of [
    [false, {}],
    [false, { MCP_STATELESS_ENABLED: "false" }],
    [true, { MCP_STATELESS_ENABLED: "true" }],
  ] as const) {
    const handler = selectMcpApiHandler(sse, env as AppEnv, legacy);
    expect(
      await (await handler.fetch(new Request("https://mcp.example/mcp"), env as AppEnv, executionContext())).text()
    ).toBe("legacy");
    const rejected = await handler.fetch(
      new Request("https://mcp.example/mcp", { headers: { "X-MCP-Confirm": "delete" } }),
      env as AppEnv,
      executionContext()
    );
    expect(rejected.status).toBe(503);
    const invalid = await handler.fetch(
      new Request("https://mcp.example/mcp", { headers: { "X-MCP-Confirm": "typo" } }),
      env as AppEnv,
      executionContext()
    );
    expect(invalid.status).toBe(400);
  }
  expect(legacy.fetch).toHaveBeenCalledTimes(3);
  expect(selectMcpApiHandler(false, { MCP_STATELESS_ENABLED: "true" } as AppEnv, legacy)).toBe(statelessMcpHandler);
});

it.each(["v1", "v2"])(
  "serves %s HTTP clients through real OAuth verification without Durable Objects or session IDs",
  async (version) => {
    const apiCalls: { auth: string | null; trace: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init: RequestInit) => {
        const headers = new Headers(init.headers);
        const auth = headers.get("authorization");
        apiCalls.push({ auth, trace: headers.get("traceparent") });
        return Response.json({ is_account_owner: auth === "Bearer owner", workspaces: [], name: auth });
      })
    );
    const { env, provider, issueToken } = authFixture();
    const ownerToken = await issueToken("owner");
    const memberToken = await issueToken("member");
    const requests: Headers[] = [];
    const modernResults: any[] = [];
    const httpFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const req = new Request(input, init);
      requests.push(req.headers);
      const response = await provider.fetch(req, env, executionContext());
      expect(response.headers.has("mcp-session-id")).toBe(false);
      if (
        req.headers.get("mcp-protocol-version") === "2026-07-28" &&
        response.headers.get("content-type")?.includes("application/json")
      )
        modernResults.push(await response.clone().json());
      return response;
    };
    const owner =
      version === "v1"
        ? new LegacyClient({ name: "owner", version: "1" })
        : new Client({ name: "owner", version: "1" }, { versionNegotiation: { mode: "auto" } });
    const member =
      version === "v1"
        ? new LegacyClient({ name: "member", version: "1" })
        : new Client({ name: "member", version: "1" }, { versionNegotiation: { mode: "auto" } });
    const makeTransport = (token: string) => {
      const options = { fetch: httpFetch, requestInit: { headers: { Authorization: `Bearer ${token}` } } };
      return version === "v1"
        ? new LegacyTransport(new URL("https://mcp.example/mcp"), options)
        : new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), options);
    };
    try {
      await owner.connect(makeTransport(ownerToken));
      await member.connect(makeTransport(memberToken));
      const ownerTools = await owner.listTools();
      const memberTools = await member.listTools();
      expect(ownerTools.tools.some((tool) => tool.name === "list-access-policies")).toBe(true);
      expect(memberTools.tools.some((tool) => tool.name === "list-access-policies")).toBe(false);
      const results = await Promise.all([
        owner.callTool({
          name: "get-myself",
          arguments: {},
          _meta: { traceparent: "00-11111111111111111111111111111111-2222222222222222-01" },
        }),
        member.callTool({ name: "get-myself", arguments: {} }),
      ]);
      expect(results[0]).toMatchObject({
        isError: false,
        content: [{ type: "text", text: expect.stringContaining("Bearer owner") }],
      });
      expect(results[1]).toMatchObject({
        isError: false,
        content: [{ type: "text", text: expect.stringContaining("Bearer member") }],
      });
      expect(
        apiCalls.some(
          (call) => call.auth === "Bearer owner" && call.trace?.startsWith("00-11111111111111111111111111111111-")
        )
      ).toBe(true);
      expect(
        apiCalls.some(
          (call) => call.auth === "Bearer member" && call.trace?.startsWith("00-11111111111111111111111111111111-")
        )
      ).toBe(false);
      const resources = await member.listResources();
      expect(resources.resources.length).toBeGreaterThan(0);
      expect(await member.readResource({ uri: resources.resources[0].uri })).toMatchObject({
        contents: [{ mimeType: "text/markdown" }],
      });
      // A fresh owner lookup occurs for each exchange, not once at initialize.
      expect(apiCalls.filter((call) => call.auth === "Bearer member").length).toBeGreaterThan(4);
      if (version === "v2") {
        expect(
          requests.some(
            (headers) => headers.get("mcp-method") === "tools/call" && headers.get("mcp-name") === "get-myself"
          )
        ).toBe(true);
        expect(modernResults.find((body) => body.result?.tools)).toMatchObject({
          result: { ttlMs: 0, cacheScope: "private" },
        });
      }
      for (const authorization of [undefined, "Bearer invalid-token"]) {
        const response = await provider.fetch(
          new Request("https://mcp.example/mcp", {
            method: "POST",
            headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
            body: "{}",
          }),
          env,
          executionContext()
        );
        expect(response.status).toBe(401);
      }
      for (const method of ["GET", "DELETE"]) {
        const response = await httpFetch("https://mcp.example/mcp", {
          method,
          headers: { Authorization: `Bearer ${memberToken}` },
        });
        expect(response.status).toBe(405);
      }
    } finally {
      await owner.close();
      await member.close();
    }
  },
  15000
);

it("does not authenticate directly from a raw Authorization header", async () => {
  const response = await statelessMcpHandler.fetch(
    new Request("https://mcp.example/mcp", { headers: { Authorization: "Bearer arbitrary" } }),
    {} as AppEnv,
    executionContext()
  );
  expect(response.status).toBe(401);
});

it("aborts the Core fetch when the modern HTTP exchange is cancelled while another request completes", async () => {
  let started!: () => void;
  let aborted!: () => void;
  const toolStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const coreAborted = new Promise<void>((resolve) => {
    aborted = resolve;
  });
  let cancelledCalls = 0;
  let coreSignal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: unknown, init: RequestInit) => {
      if (new Headers(init.headers).get("authorization") === "Bearer cancelled" && ++cancelledCalls === 2) {
        coreSignal = init.signal!;
        started();
        return new Promise<Response>((_resolve, reject) =>
          coreSignal!.addEventListener(
            "abort",
            () => {
              aborted();
              reject(coreSignal!.reason);
            },
            { once: true }
          )
        );
      }
      return Response.json({ is_account_owner: false, workspaces: [] });
    })
  );
  const env = { VANTAGE_API_HOST: "https://api.example", ENVIRONMENT: "staging" } as AppEnv;
  const controller = new AbortController();
  const request = (signal?: AbortSignal) =>
    new Request("https://mcp.example/mcp", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "tools/call",
        "Mcp-Name": "get-myself",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get-myself",
          arguments: {},
          _meta: {
            [PROTOCOL_VERSION_META_KEY]: "2026-07-28",
            [CLIENT_INFO_META_KEY]: { name: "test", version: "1" },
            [CLIENT_CAPABILITIES_META_KEY]: {},
          },
        },
      }),
    });
  const cancelled = Promise.resolve(
    statelessMcpHandler.fetch(
      request(controller.signal),
      env,
      executionContext({ tokenSet: { accessToken: "cancelled" } })
    )
  ).catch((error) => error);
  await toolStarted;
  const healthy = await statelessMcpHandler.fetch(
    request(),
    env,
    executionContext({ tokenSet: { accessToken: "healthy" } })
  );
  expect(healthy.status).toBe(200);
  expect(await healthy.json()).toMatchObject({ result: { isError: false } });
  controller.abort(new Error("HTTP exchange cancelled"));
  await coreAborted;
  expect(coreSignal?.aborted).toBe(true);
  await cancelled;
});
