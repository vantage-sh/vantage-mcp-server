import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { McpServer, type Tool } from "@modelcontextprotocol/server";
import { buildSync } from "esbuild";
import { expect, it } from "vitest";
import { serverMeta } from "../../../src/shared";
import { listToolCatalog, taggedCatalogSource, toolDefinitionChanged } from "../../../src/tools/bin/tool-catalog";
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
      const tagged = new Map(taggedTools.map((tool: Tool) => [tool.name, tool]));
      expect([...tagged.keys()].sort()).toEqual(currentTools.map((tool) => tool.name).sort());
      // The version script must not report the v1 to v2 schema dialect change as tool changes.
      expect(currentTools.filter((tool) => toolDefinitionChanged(tagged.get(tool.name)!, tool))).toEqual([]);
      expect(JSON.parse(JSON.stringify(taggedTools))).toEqual(taggedTools);
      const [first] = currentTools;
      expect(toolDefinitionChanged(first, { ...first, description: `${first.description} changed` })).toBe(true);
    } finally {
      rmSync(entry, { force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  },
  15000
);
