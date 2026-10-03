import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { buildSync } from "esbuild";
import { expect, it } from "vitest";
import { serverMeta } from "../../../src/shared";
import { listToolCatalog, taggedCatalogSource } from "../../../src/tools/bin/tool-catalog";
import { setupRegisteredTools } from "../../../src/tools/structure/registerTool";
import "../../../src/tools";

it.each([false, true])(
  "reads a tagged catalog using its matching SDK (v2=%s)",
  async (usesV2) => {
    const dir = mkdtempSync(resolve("node_modules/catalog-test-"));
    // The production tag entry lives directly in node_modules so ../src resolves.
    const entry = join(resolve("node_modules"), `${dir.split("/").pop()}.mjs`);
    const bundle = join(dir, "catalog.cjs");
    try {
      writeFileSync(entry, taggedCatalogSource(usesV2));
      buildSync({ entryPoints: [entry], bundle: true, platform: "node", format: "cjs", outfile: bundle });
      const taggedTools = await createRequire(import.meta.url)(bundle).default();
      const server = new McpServer(serverMeta);
      setupRegisteredTools(server, () => ({
        callVantageApi: async () => {
          throw new Error("Catalog must not call API");
        },
      }));
      const currentTools = await listToolCatalog(server);
      expect(taggedTools.length).toBeGreaterThan(100);
      // SDK v2 emits draft-07 and a default task-support hint. Compare the
      // application-owned definitions; the version script still sees schema changes.
      const definitions = (tools: typeof currentTools) =>
        tools.map((tool) => {
          const { $schema: _dialect, ...inputSchema } = tool.inputSchema;
          return {
            name: tool.name,
            description: tool.description,
            title: tool.title,
            annotations: tool.annotations,
            inputSchema,
          };
        });
      expect(definitions(taggedTools)).toEqual(definitions(currentTools));
      expect(JSON.parse(JSON.stringify(taggedTools))).toEqual(taggedTools);
    } finally {
      rmSync(entry, { force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  },
  15000
);
