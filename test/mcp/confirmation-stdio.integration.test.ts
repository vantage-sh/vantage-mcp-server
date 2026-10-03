import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { buildSync } from "esbuild";
import { expect, it, vi } from "vitest";

it.each(["legacy", "modern", "decline", "unsupported"])(
  "collects confirmations from the bundled stdio server (%s)",
  async (mode) => {
    const mutations: string[] = [];
    const api = createServer((req, res) => {
      if (req.method !== "GET") mutations.push(req.method!);
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify(
          req.method === "GET" ? { is_account_owner: false, workspaces: [] } : { folder: { token: "fldr_created" } }
        )
      );
    });
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const address = api.address();
    if (!address || typeof address === "string") throw new Error("Missing API address");
    const dir = mkdtempSync(join(tmpdir(), "mcp-confirmation-stdio-"));
    const bundle = join(dir, "index.cjs");
    const client = new Client(
      { name: "stdio-confirmation-test", version: "1" },
      {
        capabilities: mode === "unsupported" ? {} : { elicitation: { form: {} } },
        versionNegotiation: { mode: mode === "modern" ? { pin: "2026-07-28" } : "legacy" },
      }
    );
    const elicitation = vi.fn(async (request) => {
      expect(mutations).toHaveLength(0);
      expect(request.params.message).toContain("create-folder");
      expect(request.params.message).toContain("Stdio Confirmed Folder");
      return mode === "decline"
        ? { action: "decline" as const }
        : { action: "accept" as const, content: { confirm: true } };
    });
    if (mode !== "unsupported") client.setRequestHandler("elicitation/create", elicitation);
    try {
      buildSync({
        entryPoints: [resolve("src/local.ts")],
        bundle: true,
        platform: "node",
        target: "node20",
        outfile: bundle,
      });
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [bundle],
          stderr: "pipe",
          env: {
            VANTAGE_TOKEN: "stdio-test-token",
            VANTAGE_API_HOST: `http://127.0.0.1:${address.port}`,
            VANTAGE_MCP_CONFIRM: "create",
          },
        })
      );
      expect(client.getProtocolEra()).toBe(mode === "modern" ? "modern" : "legacy");
      const result = await client.callTool({
        name: "create-folder",
        arguments: { title: "Stdio Confirmed Folder", type: "CostFolder" },
      });
      const approved = mode === "modern" || mode === "legacy";
      expect(result, JSON.stringify(result)).toMatchObject({ isError: !approved });
      expect(mutations).toEqual(approved ? ["POST"] : []);
      expect(elicitation).toHaveBeenCalledTimes(mode === "unsupported" ? 0 : 1);
    } finally {
      await client.close();
      await new Promise<void>((resolve, reject) => api.close((error) => (error ? reject(error) : resolve())));
      rmSync(dir, { recursive: true, force: true });
    }
  },
  15000
);
