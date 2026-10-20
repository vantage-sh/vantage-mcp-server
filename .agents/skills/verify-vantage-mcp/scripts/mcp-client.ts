import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { loopback, type Report, type Run, repoRoot, timeout } from "./support";

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;
export type CallTool = (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
export type TransportName = "http" | "sse" | "stdio";

export function coreIdentity(result: ToolResult) {
  const me = toolJson(result);
  if (result.isError || !Array.isArray(me.workspaces) || typeof me.is_account_owner !== "boolean") return undefined;
  const workspaces = me.workspaces.map((workspace) => workspace?.token);
  if (workspaces.some((token) => typeof token !== "string")) return undefined;
  return {
    defaultWorkspace: me.default_workspace_token ?? null,
    workspaces: workspaces.sort(),
    isAccountOwner: me.is_account_owner,
  };
}

export function toolJson(result: ToolResult): Record<string, unknown> {
  const text =
    Array.isArray(result.content) &&
    result.content.find(
      (part: unknown): part is { type: "text"; text: string } =>
        !!part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
    );
  if (!text) throw new Error("Tool did not return JSON text");
  return JSON.parse(text.text);
}

export async function folderRoundTrip(call: CallTool, report: Report, workspace: string): Promise<void> {
  const mutation: Record<string, unknown> = {};
  report.evidence.mutation = mutation;
  let token: string | undefined;
  try {
    const title = `verify-mcp-${Date.now()}-${process.pid}`;
    const created = await call("create-folder", { title, type: "CostFolder", workspace_token: workspace });
    mutation.create = created;
    const folder = toolJson(created);
    token = typeof folder.token === "string" ? folder.token : undefined;
    mutation.token = token;
    mutation.cleanupPending = !!token;
    report.write(); // Keep the cleanup token even if a later request fails.
    report.check("folder-create", !created.isError && !!token);
    if (!token) throw new Error("Folder creation returned no token");
    const read = await call("get-folder", { folder_token: token });
    mutation.read = read;
    report.check("folder-read-back", !read.isError && toolJson(read).title === title);
  } finally {
    if (token) {
      const deleted = await call("delete-folder", { folder_token: token });
      mutation.delete = deleted;
      const deletionConfirmed = !deleted.isError && toolJson(deleted).token === token;
      report.check("folder-delete", deletionConfirmed);
      const after = await call("get-folder", { folder_token: token });
      mutation.readAfterDelete = after;
      const errors = toolJson(after).errors;
      const absent =
        after.isError === true &&
        Array.isArray(errors) &&
        errors.some((error) => /not found/i.test(typeof error === "string" ? error : JSON.stringify(error)));
      report.check("folder-absent-after-delete", absent);
      mutation.cleanupPending = !deletionConfirmed || !absent;
      report.write();
    }
  }
}

export function assertMutationTarget(run: Run): void {
  if (!run.local || run.mode !== "token" || !run.apiHost || !loopback(run.apiHost)) {
    throw new Error("--mutate requires an owned local token-mode Worker and a loopback Core API_HOST");
  }
}

export async function smoke(
  run: Run,
  report: Report,
  options: {
    transports: TransportName[];
    headers?: Record<string, string>;
    token?: string;
    expect: "success" | "core-error";
    mutate?: boolean;
  }
): Promise<void> {
  if (options.mutate) assertMutationTarget(run);
  if (options.transports.includes("stdio") && (!run.apiHost || !options.token)) {
    throw new Error("Stdio requires explicit API_HOST in run.env and VERIFY_VANTAGE_TOKEN or --token-file");
  }
  const lists: string[][] = [];
  const identities: unknown[] = [];
  const evidence: Record<string, unknown>[] = [];
  report.evidence.transports = evidence;
  for (const name of options.transports) {
    const path = name === "sse" ? "/sse" : "/mcp";
    const client = new Client({ name: "verify-vantage-mcp", version: "1" }, { capabilities: {} });
    const notifications: unknown[] = [];
    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      notifications.push(notification);
    });
    const requestInit = { headers: options.headers };
    const transport =
      name === "stdio"
        ? new StdioClientTransport({
            command: process.execPath,
            args: ["--import", "tsx", join(repoRoot, "src/local.ts")],
            cwd: repoRoot,
            env: {
              ...Object.fromEntries(
                Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
              ),
              VANTAGE_TOKEN: options.token!,
              VANTAGE_API_HOST: run.apiHost!,
            },
            stderr: "pipe",
          })
        : name === "sse"
          ? new SSEClientTransport(new URL(path, run.base), { requestInit })
          : new StreamableHTTPClientTransport(new URL(path, run.base), { requestInit });
    const item: Record<string, unknown> = {
      transport: name,
      entryPoint: name === "stdio" ? "src/local.ts" : `${run.base}${path}`,
      notifications,
    };
    evidence.push(item);
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          client.connect(transport, { timeout }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Transport connection timed out")), timeout);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      item.instructions = client.getInstructions();
      const tools = await client.listTools({}, { timeout });
      const names = tools.tools.map((tool) => tool.name).sort();
      item.tools = names;
      lists.push(names);
      report.check(`${name}-tools-listed`, names.includes("get-myself") && names.includes("list-workspaces"));
      const call: CallTool = (tool, args) => client.callTool({ name: tool, arguments: args }, undefined, { timeout });
      const myself = await call("get-myself", {});
      const workspaces = await call("list-workspaces", {});
      item.myself = myself;
      item.workspaces = workspaces;
      const me = toolJson(myself);
      if (options.expect === "core-error") {
        for (const [id, result] of [
          ["myself", myself],
          ["workspaces", workspaces],
        ] as const) {
          const errors = toolJson(result).errors;
          report.check(
            `${name}-${id}-core-error`,
            result.isError === true && Array.isArray(errors) && errors.length > 0
          );
        }
        report.check(`${name}-failed-lookup-hides-owner-tools`, !names.includes("list-access-policies"));
      } else {
        const identity = coreIdentity(myself);
        report.check(`${name}-authenticated-read`, !!identity);
        report.check(`${name}-workspaces`, !workspaces.isError && Array.isArray(toolJson(workspaces).workspaces));
        report.check(
          `${name}-owner-gating`,
          typeof me.is_account_owner === "boolean" && names.includes("list-access-policies") === me.is_account_owner
        );
        if (identity) identities.push(identity);
        if (options.mutate && name === "http") {
          if (myself.isError || typeof me.default_workspace_token !== "string")
            throw new Error("Cannot select a mutation workspace");
          await folderRoundTrip(call, report, me.default_workspace_token);
        }
      }
      const resources = await client.listResources({}, { timeout });
      item.resources = resources;
      if (!resources.resources.length) throw new Error("No resources listed");
      const resource = await client.readResource({ uri: resources.resources[0].uri }, { timeout });
      item.resourceRead = resource;
      report.check(
        `${name}-resource-markdown`,
        resource.contents.some(
          (part) =>
            part.mimeType === "text/markdown" && "text" in part && typeof part.text === "string" && part.text.length > 0
        )
      );
      if (name === "sse") {
        report.check(
          "sse-one-deprecation-warning",
          notifications.filter(
            (entry) => (entry as { params?: { logger?: string } }).params?.logger === "vantage.sse-deprecation"
          ).length === 1
        );
        report.check("sse-migration-instructions", client.getInstructions()?.includes(new URL("/mcp", run.base).href));
      }
    } catch (error) {
      item.error = error instanceof Error ? error.message : String(error);
      report.check(`${name}-execution`, false, String(item.error));
    } finally {
      await client.close();
      report.write();
    }
  }
  if (lists.length > 1)
    report.check(
      "transport-tool-parity",
      lists.every((list) => JSON.stringify(list) === JSON.stringify(lists[0]))
    );
  if (identities.length > 1)
    report.check(
      "transport-user-context",
      identities.every((identity) => JSON.stringify(identity) === JSON.stringify(identities[0]))
    );
}
