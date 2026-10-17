import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, type McpServer, type Tool } from "@modelcontextprotocol/server";

/** Enumerate through the wire protocol, including catalogs larger than one page. */
export async function listToolCatalog(server: McpServer): Promise<Tool[]> {
  const client = new Client({ name: "version-catalog", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools: Tool[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    return tools;
  } finally {
    await client.close();
    await server.close();
  }
}

// SDK v2 adds a JSON Schema dialect to every schema; it is not a tool change.
function comparableSchema(schema: Tool["inputSchema"] | Tool["outputSchema"]): string {
  if (!schema) return "undefined";
  const { $schema: _dialect, ...rest } = schema as Record<string, unknown>;
  return JSON.stringify(rest);
}

export function toolDefinitionChanged(tagTool: Tool, mainTool: Tool): boolean {
  return (
    tagTool.description !== mainTool.description ||
    JSON.stringify(tagTool.annotations) !== JSON.stringify(mainTool.annotations) ||
    comparableSchema(tagTool.inputSchema) !== comparableSchema(mainTool.inputSchema) ||
    comparableSchema(tagTool.outputSchema) !== comparableSchema(mainTool.outputSchema)
  );
}

/** A tag owns its SDK objects; only serialized tool definitions leave its bundle. */
export function taggedCatalogSource(usesV2: boolean): string {
  const imports = usesV2
    ? 'import { Client } from "@modelcontextprotocol/client";\nimport { McpServer, InMemoryTransport } from "@modelcontextprotocol/server";'
    : 'import { Client } from "@modelcontextprotocol/sdk/client/index.js";\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";';
  return `import "../src/tools";
${imports}
import { setupRegisteredTools } from "../src/tools/structure/registerTool";
import { serverMeta } from "../src/shared";
export default async function getTools() {
  const server = new McpServer(serverMeta);
  setupRegisteredTools(server, () => ({
    callVantageApi() { return Promise.reject(new Error("Not implemented")); }
  }));
  const client = new Client(serverMeta);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools = [];
    let cursor;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    return JSON.parse(JSON.stringify(tools));
  } finally {
    await client.close();
    await server.close();
  }
}
`;
}
