import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { buildSync } from "esbuild";
import { expect, it } from "vitest";

it("initializes the bundled stdio server and serves tools/resources through SDK v2", async () => {
  const requests: { path: string; authorization: string | undefined }[] = [];
  const api = createServer((req, res) => {
    requests.push({ path: req.url!, authorization: req.headers.authorization });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ is_account_owner: false, workspaces: [], name: "Test User" }));
  });
  await new Promise<void>((done) => api.listen(0, "127.0.0.1", done));
  const address = api.address();
  if (!address || typeof address === "string") throw new Error("Missing API address");
  const dir = mkdtempSync(join(tmpdir(), "mcp-stdio-"));
  const bundle = join(dir, "index.cjs");
  const client = new Client({ name: "stdio-test", version: "1" });
  try {
    buildSync({
      entryPoints: [resolve("src/local.ts")],
      bundle: true,
      platform: "node",
      target: "node20",
      outfile: bundle,
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [bundle],
      env: { VANTAGE_TOKEN: "stdio-test-token", VANTAGE_API_HOST: `http://127.0.0.1:${address.port}` },
      stderr: "pipe",
    });
    await client.connect(transport);
    const catalog = await client.listTools();
    expect(catalog.tools.some((tool) => tool.name === "get-myself")).toBe(true);
    expect(catalog.tools.some((tool) => tool.name.includes("access-polic"))).toBe(false);
    const result = await client.callTool({ name: "get-myself" });
    expect(result).toMatchObject({ isError: false });
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ is_account_owner: false, workspaces: [], name: "Test User" }, null, 2) },
    ]);
    expect(requests).toEqual([
      { path: "/v2/me", authorization: "Bearer stdio-test-token" },
      { path: "/v2/me", authorization: "Bearer stdio-test-token" },
    ]);
    const resources = await client.listResources();
    expect(resources.resources.length).toBeGreaterThan(0);
    const resource = await client.readResource({ uri: resources.resources[0].uri });
    expect(resource.contents[0].mimeType).toBe("text/markdown");
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) => api.close((error) => (error ? reject(error) : resolve())));
    rmSync(dir, { recursive: true, force: true });
  }
}, 15000);
