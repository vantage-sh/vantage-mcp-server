import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { afterEach, expect, it, vi } from "vitest";
import z from "zod";
import { callApi } from "../../../src/shared";
import registerTool, {
  clearRegisteredToolsForTesting,
  setupRegisteredTools,
} from "../../../src/tools/structure/registerTool";

afterEach(() => {
  clearRegisteredToolsForTesting();
  vi.unstubAllGlobals();
});

it("cancels the pending Core request without cancelling a concurrent tool call", async () => {
  const signals: AbortSignal[] = [];
  const traceHeaders: string[] = [];
  let started!: () => void;
  let cancelled!: () => void;
  let completeSecond!: () => void;
  const bothStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const firstCancelled = new Promise<void>((resolve) => {
    cancelled = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (input: string, options: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = options.signal!;
          signals.push(signal);
          traceHeaders.push(new Headers(options.headers).get("traceparent")!);
          const page = new URL(input).searchParams.get("page");
          if (page === "1")
            signal.addEventListener(
              "abort",
              () => {
                cancelled();
                reject(signal.reason);
              },
              { once: true }
            );
          else completeSecond = () => resolve(Response.json({ workspaces: [] }));
          if (signals.length === 2) started();
        })
    )
  );
  registerTool({
    name: "cancellable-test",
    title: "Cancellable Test",
    description: "Test request cancellation",
    args: { page: z.number() },
    annotations: { readOnly: true, destructive: false, openWorld: false },
    async execute(args, ctx) {
      const result = await ctx.callVantageApi("/v2/workspaces", { page: args.page }, "GET");
      return { ok: result.ok };
    },
  });
  const server = new McpServer({ name: "test", version: "1" });
  const client = new Client({ name: "test", version: "1" });
  setupRegisteredTools(server, () => ({
    callVantageApi: (endpoint, params, method, signal) =>
      callApi("https://api.example", {}, params, method, endpoint, undefined, signal),
  }));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const controller = new AbortController();
    const first = client
      .callTool(
        {
          name: "cancellable-test",
          arguments: { page: 1 },
          _meta: { traceparent: "00-11111111111111111111111111111111-2222222222222222-01" },
        },
        { signal: controller.signal }
      )
      .catch((error) => error);
    const second = client.callTool({ name: "cancellable-test", arguments: { page: 2 } });
    await bothStarted;
    expect(traceHeaders[0]).toMatch(/^00-11111111111111111111111111111111-/);
    expect(traceHeaders[1]).not.toMatch(/^00-11111111111111111111111111111111-/);
    controller.abort(new Error("user cancelled"));
    await firstCancelled;
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    expect(await first).toBeInstanceOf(Error);
    completeSecond();
    expect(await second).toMatchObject({
      isError: false,
      content: [{ type: "text", text: JSON.stringify({ ok: true }, null, 2) }],
    });
  } finally {
    await client.close();
    await server.close();
  }
});
