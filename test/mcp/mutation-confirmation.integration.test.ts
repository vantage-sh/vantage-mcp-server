import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as LegacyTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterEach, expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/env";
import { statelessMcpHandler } from "../../src/mcp/stateless";

afterEach(() => vi.unstubAllGlobals());
const env = {
  VANTAGE_API_HOST: "https://api.example",
  ENVIRONMENT: "staging",
  MCP_CONFIRMATION_SECRET: "test-only-shared-secret-with-32-bytes",
} as AppEnv;
function executionContext(principal = "alice") {
  return { props: { tokenSet: { accessToken: principal } }, waitUntil: vi.fn() } as unknown as ExecutionContext;
}
function apiFixture() {
  const mutations: { method: string; url: string; headers: Headers }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (init.method !== "GET") mutations.push({ method: init.method!, url, headers: new Headers(init.headers) });
      if (init.method === "DELETE") return new Response(null, { status: 204 });
      return Response.json(
        init.method === "GET" ? { is_account_owner: false, workspaces: [] } : { folder: { token: "fldr_new" } }
      );
    })
  );
  return mutations;
}
function transport(policy: string | undefined, principal = "alice", runtimeEnv = env) {
  return new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), {
    requestInit: { headers: policy ? { "X-MCP-Confirm": policy } : {} },
    fetch: async (input, init) =>
      statelessMcpHandler.fetch(new Request(input, init), runtimeEnv, executionContext(principal)),
  });
}
function modernClient(elicitation = true) {
  return new Client(
    { name: "confirmation-test", version: "1" },
    { versionNegotiation: { mode: "auto" }, capabilities: elicitation ? { elicitation: { form: {} } } : {} }
  );
}
const calls = [
  { name: "create-folder", arguments: { title: "Confirmed Folder", type: "CostFolder" } },
  { name: "update-folder", arguments: { folder_token: "fldr_target", title: "Confirmed Title" } },
  { name: "delete-folder", arguments: { folder_token: "fldr_target" } },
];

it("confirms every CRUD operation through modern HTTP retries before sending the Core mutation", async () => {
  const mutations = apiFixture();
  const client = modernClient();
  let expectedBeforePrompt = 0;
  const elicitation = vi.fn(async (request) => {
    expect(mutations).toHaveLength(expectedBeforePrompt);
    expect(request.params.message).toContain(calls[expectedBeforePrompt].name);
    return { action: "accept" as const, content: { confirm: true } };
  });
  client.setRequestHandler("elicitation/create", elicitation);
  try {
    await client.connect(transport("all"));
    for (const call of calls) {
      expectedBeforePrompt = mutations.length;
      expect(await client.callTool(call)).toMatchObject({ isError: false });
    }
    expect(elicitation).toHaveBeenCalledTimes(3);
    expect(mutations.map((mutation) => mutation.method)).toEqual(["POST", "PUT", "DELETE"]);
    for (const mutation of mutations) expect(mutation.headers.has("x-mcp-confirm")).toBe(false);
  } finally {
    await client.close();
  }
});

it.each(["decline", "cancel", "unchecked"])("makes no mutation when confirmation is %s", async (action) => {
  const mutations = apiFixture();
  const client = modernClient();
  const elicitation = vi.fn(async () =>
    action === "unchecked"
      ? { action: "accept" as const, content: { confirm: false } }
      : { action: action as "decline" | "cancel" }
  );
  client.setRequestHandler("elicitation/create", elicitation);
  try {
    await client.connect(transport("all"));
    const result = await client.callTool(calls[2]);
    expect(result).toMatchObject({ isError: true });
    expect(elicitation).toHaveBeenCalledOnce();
    expect(mutations).toHaveLength(0);
  } finally {
    await client.close();
  }
});

it("isolates per-caller header choices and confirms only the selected tool", async () => {
  const mutations = apiFixture();
  const selected = modernClient();
  const unrestricted = modernClient(false);
  const elicitation = vi.fn(async () => ({ action: "accept" as const, content: { confirm: true } }));
  selected.setRequestHandler("elicitation/create", elicitation);
  try {
    await selected.connect(transport("delete-folder"));
    await unrestricted.connect(transport(undefined, "bob", { ...env, MCP_CONFIRMATION_SECRET: undefined }));
    expect(await selected.callTool(calls[0])).toMatchObject({ isError: false });
    expect(elicitation).not.toHaveBeenCalled();
    expect(await unrestricted.callTool(calls[2])).toMatchObject({ isError: false });
    expect(await selected.callTool(calls[2])).toMatchObject({ isError: false });
    expect(elicitation).toHaveBeenCalledOnce();
    expect(mutations).toHaveLength(3);
  } finally {
    await selected.close();
    await unrestricted.close();
  }
});

it("refuses selected mutations for clients without form elicitation", async () => {
  const mutations = apiFixture();
  const client = modernClient(false);
  try {
    await client.connect(transport("delete"));
    expect(await client.callTool(calls[2])).toMatchObject({ isError: true });
    expect(mutations).toHaveLength(0);
  } finally {
    await client.close();
  }
});

it("does not resume a mutation when the originating call is cancelled during confirmation", async () => {
  const mutations = apiFixture();
  const client = modernClient();
  let entered!: () => void;
  let accept!: () => void;
  const promptEntered = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const decision = new Promise<void>((resolve) => {
    accept = resolve;
  });
  client.setRequestHandler("elicitation/create", async () => {
    entered();
    await decision;
    return { action: "accept", content: { confirm: true } };
  });
  try {
    await client.connect(transport("all"));
    const controller = new AbortController();
    const call = client.callTool(calls[2], { signal: controller.signal }).catch((error) => error);
    await promptEntered;
    controller.abort(new Error("User cancelled the original tool call"));
    accept();
    expect(await call).toBeInstanceOf(Error);
    expect(mutations).toHaveLength(0);
  } finally {
    accept();
    await client.close();
  }
});

it("fails closed for legacy stateless HTTP where live elicitation capabilities cannot survive per-request serving", async () => {
  const mutations = apiFixture();
  const client = new LegacyClient({ name: "legacy", version: "1" }, { capabilities: { elicitation: { form: {} } } });
  const http = new LegacyTransport(new URL("https://mcp.example/mcp"), {
    requestInit: { headers: { "X-MCP-Confirm": "delete" } },
    fetch: async (input, init) => statelessMcpHandler.fetch(new Request(input, init), env, executionContext()),
  });
  try {
    await client.connect(http);
    expect(await client.callTool(calls[2])).toMatchObject({ isError: true });
    expect(mutations).toHaveLength(0);
  } finally {
    await client.close();
  }
});

function rawRequest(
  call: (typeof calls)[number],
  continuation?: { requestState?: string; inputResponses?: Record<string, unknown> }
) {
  return new Request("https://mcp.example/mcp", {
    method: "POST",
    headers: {
      "X-MCP-Confirm": "all",
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2026-07-28",
      "Mcp-Method": "tools/call",
      "Mcp-Name": call.name,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        ...call,
        ...continuation,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: "2026-07-28",
          [CLIENT_INFO_META_KEY]: { name: "manual", version: "1" },
          [CLIENT_CAPABILITIES_META_KEY]: { elicitation: { form: {} } },
        },
      },
    }),
  });
}

it("rejects tampered or mismatched HTTP continuation state before any mutation", async () => {
  const mutations = apiFixture();
  const first = await statelessMcpHandler.fetch(rawRequest(calls[2]), env, executionContext());
  const { result } = (await first.json()) as {
    result: { requestState: string; inputRequests: Record<string, unknown>; resultType: string };
  };
  expect(result.resultType).toBe("input_required");
  expect(mutations).toHaveLength(0);
  const responseKey = Object.keys(result.inputRequests)[0];
  const inputResponses = { [responseKey]: { action: "accept", content: { confirm: true } } };
  for (const [call, state, principal] of [
    [calls[2], `${result.requestState}x`, "alice"],
    [calls[2], result.requestState, "bob"],
    [{ ...calls[2], arguments: { folder_token: "fldr_different" } }, result.requestState, "alice"],
    [calls[1], result.requestState, "alice"],
  ] as const) {
    const response = await statelessMcpHandler.fetch(
      rawRequest(call, { requestState: state, inputResponses }),
      env,
      executionContext(principal)
    );
    const body = (await response.json()) as { error?: unknown; result?: { isError: boolean } };
    expect(body.error || body.result?.isError).toBeTruthy();
    expect(mutations).toHaveLength(0);
  }
  const approved = await statelessMcpHandler.fetch(
    rawRequest(calls[2], { requestState: result.requestState, inputResponses }),
    env,
    executionContext()
  );
  expect(await approved.json()).toMatchObject({ result: { isError: false } });
  expect(mutations).toHaveLength(1);
});

it("rejects invalid headers and missing signing configuration instead of silently skipping confirmations", async () => {
  const mutations = apiFixture();
  const badPolicy = new Request("https://mcp.example/mcp", { headers: { "X-MCP-Confirm": "all,delete" } });
  expect((await statelessMcpHandler.fetch(badPolicy, env, executionContext())).status).toBe(400);
  expect(
    (
      await statelessMcpHandler.fetch(
        rawRequest(calls[2]),
        { ...env, MCP_CONFIRMATION_SECRET: undefined },
        executionContext()
      )
    ).status
  ).toBe(503);
  expect(mutations).toHaveLength(0);
});
