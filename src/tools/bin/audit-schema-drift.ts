/**
 * Compare MCP tool Zod input schemas against @vantage-sh/vantage-client OpenAPI types.
 *
 * Usage:
 *   npm run audit-schema-drift
 *   npm run audit-schema-drift -- --json
 *   npm run audit-schema-drift -- --only-drift
 *
 * Exit code 1 when any tool has missing/extra parameter drift (not unmapped endpoints).
 *
 * Limitations: parses exported `const args` objects from sibling schema files when tools use
 * `args: someArgs` imports; does not evaluate Zod transforms (e.g. groupings arrays joined to strings).
 * Intentional omissions: see audit-schema-drift-exclusions.ts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_DRIFT_EXCLUSIONS, type SchemaDriftExclusion } from "./audit-schema-drift-exclusions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const TOOLS_DIR = join(REPO_ROOT, "src/tools");
const VC_TYPES_PATH = join(REPO_ROOT, "node_modules/@vantage-sh/vantage-client/dist/index.d.ts");

const SKIP_DIRS = new Set(["structure", "utils", "bin"]);
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** Normalized paths whose brace segment names differ from the OpenAPI path template. */
const ENDPOINT_ALIASES: Record<string, string> = {
  "/v2/teams/{token}": "/v2/teams/{team_token}",
};

/** OpenAPI path param name -> tool arg name(s) that supply the segment. */
const PATH_PARAM_TOOL_ARG_ALIASES: Record<string, string[]> = {
  team_token: ["token"],
};

/** Query keys tools add in execute() but often omit from Zod (informational, not counted as drift). */
const COMMONLY_INJECTED_QUERY_KEYS = new Set(["limit", "page"]);

/** Tool arg -> API query key (intentional renames — do not report as drift). */
const TOOL_ARG_ALIASES: Record<string, string[]> = {
  settings_include_credits: ["settings[include_credits]"],
  settings_include_refunds: ["settings[include_refunds]"],
  settings_include_discounts: ["settings[include_discounts]"],
  settings_include_tax: ["settings[include_tax]"],
  settings_amortize: ["settings[amortize]"],
  settings_unallocated: ["settings[unallocated]"],
  settings_aggregate_by: ["settings[aggregate_by]"],
  settings_show_previous_period: ["settings[show_previous_period]"],
};

type OpParams = {
  query: string[];
  pathParams: string[];
  bodySchema: string | null;
};

type ToolRecord = {
  file: string;
  name: string;
  endpoint: string;
  method: HttpMethod;
  argKeys: Set<string>;
  injectedKeys: Set<string>;
  source: string;
};

type DriftRow = {
  tool: string;
  file: string;
  endpoint: string;
  method: HttpMethod;
  operation: string | null;
  missingInSchema: string[];
  extraInSchema: string[];
  injectedNotInSchema: string[];
  unmapped: boolean;
};

function readVantageClientTypes(): string {
  try {
    return readFileSync(VC_TYPES_PATH, "utf8");
  } catch {
    console.error(`Could not read ${VC_TYPES_PATH}. Run npm install first.`);
    process.exit(2);
  }
}

function buildPathMethodToOperation(typesContent: string): Map<string, string> {
  const map = new Map<string, string>();
  const pathBlockRe = /"(\/[^"]+)":\s*\{([\s\S]*?)\n {4}\};/g;
  let match = pathBlockRe.exec(typesContent);
  while (match !== null) {
    const swaggerPath = match[1];
    const block = match[2];
    const v2Path = `/v2${swaggerPath}`;
    for (const method of ["get", "post", "put", "delete"] as const) {
      const opMatch = block.match(new RegExp(`\\s+${method}:\\s+operations\\["([^"]+)"\\]`));
      if (opMatch) {
        map.set(`${v2Path}:${method.toUpperCase()}`, opMatch[1]);
      }
    }
    match = pathBlockRe.exec(typesContent);
  }
  return map;
}

function parseOperationParams(typesContent: string, opName: string): OpParams | null {
  const opRe = new RegExp(`\\n    ${opName}: \\{([\\s\\S]*?)^    \\};`, "m");
  const opMatch = typesContent.match(opRe);
  if (!opMatch) {
    return null;
  }
  const block = opMatch[1];

  const query: string[] = [];
  const queryBlock = block.match(/query\?:\s*\{([\s\S]*?)\n {12}\};/);
  if (queryBlock) {
    for (const key of queryBlock[1].matchAll(/^\s{16}([a-z_][a-z0-9_]*)\??:/gm)) {
      query.push(key[1]);
    }
    for (const key of queryBlock[1].matchAll(/"([^"]+)"\?:/g)) {
      if (!query.includes(key[1])) {
        query.push(key[1]);
      }
    }
  }

  const pathParams: string[] = [];
  const pathBlock = block.match(/path:\s*\{([\s\S]*?)\n {12}\};/);
  if (pathBlock) {
    for (const key of pathBlock[1].matchAll(/^\s{16}([a-z_]+):/gm)) {
      pathParams.push(key[1]);
    }
  }

  let bodySchema: string | null = null;
  const requestSection = block.match(/requestBody:[\s\S]*?(?=responses:|$)/)?.[0];
  if (requestSection) {
    const bodyMatch = requestSection.match(/components\["schemas"\]\["([^"]+)"\]/);
    if (bodyMatch) {
      bodySchema = bodyMatch[1];
    }
  }

  return { query, pathParams, bodySchema };
}

function parseSchemaProperties(typesContent: string, schemaName: string): string[] {
  const schemaRe = new RegExp(`\\n        ${schemaName}: \\{([\\s\\S]*?)^        \\};`, "m");
  const match = typesContent.match(schemaRe);
  if (!match) {
    return [];
  }
  return [...match[1].matchAll(/\n {12}([a-z_][a-z0-9_]*)(\?)?:/g)].map((m) => m[1]);
}

function normalizeEndpoint(template: string): string {
  const normalized = template
    .replace(/\$\{pathEncode\(args\.([a-z_]+)\)\}/g, "{$1}")
    .replace(/\$\{pathEncode\(([a-z_]+)\)\}/g, "{$1}");
  return ENDPOINT_ALIASES[normalized] ?? normalized;
}

function extractEndpoint(source: string): string | undefined {
  const callIndex = source.indexOf("callVantageApi(");
  if (callIndex === -1) {
    return undefined;
  }
  const slice = source.slice(callIndex);
  const match = slice.match(/callVantageApi\(\s*(?:\n\s*)?[`"]([^`"]+)[`"]/);
  return match?.[1];
}

function extractHttpMethod(source: string): HttpMethod | undefined {
  const callIndex = source.lastIndexOf("callVantageApi(");
  if (callIndex === -1) {
    return undefined;
  }
  const slice = source.slice(callIndex, callIndex + 1200);
  const methods = [...slice.matchAll(/"(GET|POST|PUT|DELETE)"/g)];
  return methods.at(-1)?.[1] as HttpMethod | undefined;
}

function addArgKeysFromBlock(keys: Set<string>, block: string, indent: "  " | "    "): void {
  const pattern = indent === "  " ? /\n {2}([a-z][a-z0-9_]*):/g : /\n {4}([a-z][a-z0-9_]*):/g;
  for (const key of block.matchAll(pattern)) {
    keys.add(key[1]);
  }
}

function resolveImportedArgsBlock(toolFilePath: string, source: string, exportName: string): string | null {
  const importMatch = source.match(
    new RegExp(`import\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`)
  );
  if (!importMatch) {
    return null;
  }
  const resolved = join(dirname(toolFilePath), `${importMatch[1].replace(/\.js$/, "")}.ts`);
  try {
    const imported = readFileSync(resolved, "utf8");
    const exportMatch = imported.match(new RegExp(`export const ${exportName} = \\{([\\s\\S]*?)\\n\\};`));
    return exportMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function resolveSpreadArgKeys(
  toolFilePath: string | undefined,
  source: string,
  block: string,
  keys: Set<string>
): void {
  if (!toolFilePath) {
    return;
  }
  for (const ref of block.matchAll(/\.\.(\w+)/g)) {
    const spreadBlock = resolveImportedArgsBlock(toolFilePath, source, ref[1]);
    if (spreadBlock) {
      addArgKeysFromBlock(keys, spreadBlock, "  ");
    }
  }
}

function extractToolArgKeys(source: string, toolFilePath?: string): Set<string> {
  const keys = new Set<string>();

  const constArgsMatch = source.match(/const args = \{([\s\S]*?)\n\};/);
  if (constArgsMatch) {
    addArgKeysFromBlock(keys, constArgsMatch[1], "  ");
    resolveSpreadArgKeys(toolFilePath, source, constArgsMatch[1], keys);
  }

  const inlineArgsMatch =
    source.match(/args:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*(?:annotations:|async execute)/) ??
    source.match(/args:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*async execute/);
  if (inlineArgsMatch) {
    addArgKeysFromBlock(keys, inlineArgsMatch[1], "    ");
    resolveSpreadArgKeys(toolFilePath, source, inlineArgsMatch[1], keys);
  }

  const externalArgsRef = source.match(/args:\s*(\w+),/);
  if (externalArgsRef && toolFilePath && !source.includes(`const ${externalArgsRef[1]} =`)) {
    const block = resolveImportedArgsBlock(toolFilePath, source, externalArgsRef[1]);
    if (block) {
      addArgKeysFromBlock(keys, block, "  ");
    }
  }

  return keys;
}

function extractInjectedRequestKeys(source: string): Set<string> {
  const injected = new Set<string>();
  if (/\blimit:\s*(?:DEFAULT_LIMIT|\d+)/.test(source)) {
    injected.add("limit");
  }
  if (/\bpage:\s*/.test(source) && /requestParams|callVantageApi/.test(source)) {
    injected.add("page");
  }
  for (const key of source.matchAll(/requestParams\[["']([^"']+)["']\]/g)) {
    injected.add(key[1]);
  }
  for (const key of source.matchAll(/requestParams\[`([^`]+)`\]/g)) {
    injected.add(key[1]);
  }
  return injected;
}

function walkToolFiles(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir)) {
    const full = join(dir, ent);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(ent)) {
        walkToolFiles(full, acc);
      }
      continue;
    }
    if (ent.endsWith(".ts") && !ent.endsWith(".test.ts") && ent !== "index.ts") {
      acc.push(full);
    }
  }
  return acc;
}

function discoverTools(): ToolRecord[] {
  const tools: ToolRecord[] = [];

  for (const filePath of walkToolFiles(TOOLS_DIR)) {
    const source = readFileSync(filePath, "utf8");
    if (!source.includes("registerTool")) {
      continue;
    }

    const nameMatch = source.match(/name:\s*"([^"]+)"/);
    const endpointRaw = extractEndpoint(source);
    const method = extractHttpMethod(source);

    if (!nameMatch || !endpointRaw || !method) {
      continue;
    }

    tools.push({
      file: relative(REPO_ROOT, filePath),
      name: nameMatch[1],
      endpoint: normalizeEndpoint(endpointRaw),
      method,
      argKeys: extractToolArgKeys(source, filePath),
      injectedKeys: extractInjectedRequestKeys(source),
      source,
    });
  }

  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

function expandToolKeys(tool: ToolRecord): Set<string> {
  const expanded = new Set(tool.argKeys);
  for (const key of tool.argKeys) {
    for (const alias of TOOL_ARG_ALIASES[key] ?? []) {
      expanded.add(alias);
    }
  }
  const pathParam = tool.endpoint.match(/\{([^}]+)\}/)?.[1];
  if (pathParam) {
    for (const key of tool.argKeys) {
      if (key === pathParam || key === pathParam.replace(/_token$/, "") || `${key}_token` === pathParam) {
        expanded.add(pathParam);
      }
    }
    for (const alias of PATH_PARAM_TOOL_ARG_ALIASES[pathParam] ?? []) {
      if (tool.argKeys.has(alias)) {
        expanded.add(pathParam);
      }
    }
  }
  return expanded;
}

function toolArgRepresentedInApi(apiKeys: Set<string>, toolKey: string): boolean {
  if (apiKeys.has(toolKey)) {
    return true;
  }
  for (const alias of TOOL_ARG_ALIASES[toolKey] ?? []) {
    if (apiKeys.has(alias)) {
      return true;
    }
  }
  return false;
}

function apiKeysForTool(typesContent: string, method: HttpMethod, operation: string | null): Set<string> {
  if (!operation) {
    return new Set();
  }
  const op = parseOperationParams(typesContent, operation);
  if (!op) {
    return new Set();
  }

  const keys = new Set<string>();
  for (const k of op.query) {
    keys.add(k);
  }
  for (const k of op.pathParams) {
    keys.add(k);
  }

  if (method === "POST" || method === "PUT") {
    if (op.bodySchema) {
      for (const k of parseSchemaProperties(typesContent, op.bodySchema)) {
        keys.add(k);
      }
    }
  }

  return keys;
}

function isSchemaDriftExcluded(
  toolName: string,
  operation: string | null,
  apiKey: string,
  kind: SchemaDriftExclusion["kind"]
): boolean {
  return SCHEMA_DRIFT_EXCLUSIONS.some((exclusion) => {
    if (exclusion.kind !== kind) {
      return false;
    }
    if (exclusion.apiKey !== apiKey) {
      return false;
    }
    if (exclusion.tool !== undefined && exclusion.tool !== toolName) {
      return false;
    }
    if (exclusion.operation !== undefined && exclusion.operation !== operation) {
      return false;
    }
    return true;
  });
}

function compareTool(tool: ToolRecord, typesContent: string, pathMethodToOp: Map<string, string>): DriftRow {
  const lookupKey = `${tool.endpoint}:${tool.method}`;
  const operation = pathMethodToOp.get(lookupKey) ?? null;
  const apiKeys = apiKeysForTool(typesContent, tool.method, operation);
  const toolExpanded = expandToolKeys(tool);

  const missingInSchema: string[] = [];
  const injectedNotInSchema: string[] = [];
  const extraInSchema: string[] = [];

  if (!operation) {
    return {
      tool: tool.name,
      file: tool.file,
      endpoint: tool.endpoint,
      method: tool.method,
      operation: null,
      missingInSchema: [],
      extraInSchema: [],
      injectedNotInSchema: [],
      unmapped: true,
    };
  }

  for (const apiKey of apiKeys) {
    if (toolExpanded.has(apiKey)) {
      continue;
    }
    if (tool.injectedKeys.has(apiKey) || COMMONLY_INJECTED_QUERY_KEYS.has(apiKey)) {
      if (!tool.argKeys.has(apiKey)) {
        injectedNotInSchema.push(apiKey);
      }
      continue;
    }
    if (isSchemaDriftExcluded(tool.name, operation, apiKey, "missing")) {
      continue;
    }
    missingInSchema.push(apiKey);
  }

  const pathParam = tool.endpoint.match(/\{([^}]+)\}/)?.[1];
  for (const toolKey of tool.argKeys) {
    if (toolKey.startsWith("settings[")) {
      continue;
    }
    if (apiKeys.size === 0) {
      continue;
    }
    if (pathParam && (PATH_PARAM_TOOL_ARG_ALIASES[pathParam] ?? []).includes(toolKey) && apiKeys.has(pathParam)) {
      continue;
    }
    if (!toolArgRepresentedInApi(apiKeys, toolKey)) {
      if (!isSchemaDriftExcluded(tool.name, operation, toolKey, "extra")) {
        extraInSchema.push(toolKey);
      }
    }
  }

  return {
    tool: tool.name,
    file: tool.file,
    endpoint: tool.endpoint,
    method: tool.method,
    operation,
    missingInSchema: missingInSchema.sort(),
    extraInSchema: extraInSchema.sort(),
    injectedNotInSchema: injectedNotInSchema.sort(),
    unmapped: false,
  };
}

function hasDrift(row: DriftRow): boolean {
  return row.unmapped || row.missingInSchema.length > 0 || row.extraInSchema.length > 0;
}

function printHumanReport(rows: DriftRow[], clientVersion: string): void {
  console.log(`Schema drift audit (@vantage-sh/vantage-client from ${VC_TYPES_PATH})`);
  console.log(`Tools scanned: ${rows.length}\n`);

  const driftRows = rows.filter(hasDrift);
  const unmapped = driftRows.filter((r) => r.unmapped);
  const paramDrift = driftRows.filter((r) => !r.unmapped);

  if (unmapped.length > 0) {
    console.log("=== Unmapped endpoints ===\n");
    for (const row of unmapped) {
      console.log(`  ${row.tool}`);
      console.log(`    ${row.method} ${row.endpoint}`);
      console.log(`    ${row.file}\n`);
    }
  }

  if (paramDrift.length > 0) {
    console.log("=== Parameter drift ===\n");
    for (const row of paramDrift) {
      console.log(`${row.tool} (${row.operation})`);
      console.log(`  ${row.method} ${row.endpoint}`);
      console.log(`  ${row.file}`);
      if (row.missingInSchema.length > 0) {
        console.log(`  Missing from tool schema (in API): ${row.missingInSchema.join(", ")}`);
      }
      if (row.extraInSchema.length > 0) {
        console.log(`  Extra in tool schema (not in API): ${row.extraInSchema.join(", ")}`);
      }
      if (row.injectedNotInSchema.length > 0) {
        console.log(`  Injected in execute only (OK): ${row.injectedNotInSchema.join(", ")}`);
      }
      console.log();
    }
  }

  const clean = rows.length - driftRows.length;
  console.log(
    `Summary: ${paramDrift.length} tool(s) with parameter drift, ${unmapped.length} unmapped, ${clean} aligned (or injection-only).`
  );
  console.log(`Client package version in package.json: ${clientVersion}`);
}

function readClientVersion(): string {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  return pkg.dependencies?.["@vantage-sh/vantage-client"] ?? "unknown";
}

function main(): void {
  const jsonOutput = process.argv.includes("--json");
  const onlyDrift = process.argv.includes("--only-drift");

  const typesContent = readVantageClientTypes();
  const pathMethodToOp = buildPathMethodToOperation(typesContent);
  const tools = discoverTools();
  let rows = tools.map((tool) => compareTool(tool, typesContent, pathMethodToOp));

  if (onlyDrift) {
    rows = rows.filter(hasDrift);
  }

  const clientVersion = readClientVersion();

  if (jsonOutput) {
    console.log(JSON.stringify({ clientVersion, tools: rows }, null, 2));
  } else {
    printHumanReport(rows, clientVersion);
  }

  const failing = rows.filter((r) => r.unmapped || r.missingInSchema.length > 0 || r.extraInSchema.length > 0);
  if (failing.length > 0 && !jsonOutput) {
    process.exit(1);
  }
}

main();
