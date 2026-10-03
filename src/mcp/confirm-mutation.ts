import {
  acceptedContent,
  CLIENT_CAPABILITIES_META_KEY,
  type ClientCapabilities,
  createRequestStateCodec,
  type InputRequiredResult,
  inputRequired,
  type ServerContext,
} from "@modelcontextprotocol/server";
import z from "zod";
import MCPUserError from "../tools/structure/MCPUserError";
import { type ConfirmationPolicy, requiresConfirmation } from "./confirmation-policy";
import type { ToolRequestContext } from "./registration";

const confirmationSchema = z.object({
  confirm: z.boolean().describe("Confirm this exact operation. Leave unchecked to make no changes."),
});
type PendingConfirmation = { version: 1; tool: string; argsHash: string; responseKey: string };
export type MutationConfirmation = (
  tool: { name: string; title: string },
  args: unknown,
  context: ToolRequestContext
) => Promise<InputRequiredResult | undefined>;

export function createMutationConfirmation(options: {
  policy: ConfirmationPolicy;
  key: string | Uint8Array;
  principal: string;
  clientCapabilities: () => ClientCapabilities | undefined;
  ttlSeconds?: number;
}) {
  const codec = createRequestStateCodec<PendingConfirmation>({
    key: options.key,
    ttlSeconds: options.ttlSeconds ?? 300,
    bind: (context) => JSON.stringify([options.principal, options.policy.key, context.mcpReq.method]),
  });
  const confirm: MutationConfirmation = async (tool, args, context) => {
    if (!requiresConfirmation(options.policy, tool.name)) return;
    context.mcpReq?.signal.throwIfAborted();
    // Modern stdio carries capabilities on each request rather than the
    // legacy initialize state exposed by getClientCapabilities().
    const capabilities = (context.mcpReq?.envelope?.[CLIENT_CAPABILITIES_META_KEY] ?? options.clientCapabilities()) as
      | ClientCapabilities
      | undefined;
    const elicitation = capabilities?.elicitation;
    if (!elicitation || (elicitation.form === undefined && Object.keys(elicitation).length !== 0)) {
      refuse(
        "This operation requires form elicitation. Use a client that supports confirmations; no changes were made."
      );
    }
    if (!context.mcpReq?.requestState) refuse("Confirmations require the SDK v2 runtime; no changes were made.");
    const state = context.mcpReq.requestState() as PendingConfirmation | undefined;
    const argsHash = await hashArguments(args);
    if (state !== undefined || context.mcpReq.inputResponses !== undefined) {
      if (
        !state ||
        state.version !== 1 ||
        state.tool !== tool.name ||
        state.argsHash !== argsHash ||
        typeof state.responseKey !== "string"
      ) {
        refuse(
          "Confirmation does not match this operation. Retry the tool to request a new confirmation; no changes were made."
        );
      }
      const response = acceptedContent(context.mcpReq.inputResponses, state.responseKey, confirmationSchema);
      if (response?.confirm !== true) refuse(`${tool.title} was not confirmed; no changes were made.`);
      context.mcpReq.signal.throwIfAborted();
      return;
    }
    const responseKey = `confirm-${crypto.randomUUID()}`;
    // This is proof of a pending challenge, never proof of approval. The client
    // must also return an explicit, schema-validated acceptance on the retry.
    return inputRequired({
      requestState: await codec.mint({ version: 1, tool: tool.name, argsHash, responseKey }, context as ServerContext),
      inputRequests: {
        [responseKey]: inputRequired.elicit({
          mode: "form",
          message: `Confirm ${tool.title} (${tool.name}) with these arguments:\n${argumentPreview(args)}`,
          requestedSchema: confirmationSchema,
        }),
      },
    });
  };
  return { confirm, serverOptions: { requestState: { verify: codec.verify } } };
}

function refuse(message: string): never {
  throw new MCPUserError({ errors: [{ message }] });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)])
    );
  return value;
}

async function hashArguments(args: unknown): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(args))));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function argumentPreview(args: unknown): string {
  const text = JSON.stringify(
    args,
    (key, value) =>
      /secret|password|credential|authorization|api[_-]?key|api[_-]?token|private[_-]?key/i.test(key) ||
      (typeof value === "string" && value.startsWith("vntg_tkn"))
        ? "[redacted]"
        : value,
    2
  );
  // Never authorize an operation whose arguments the user cannot fully inspect.
  if (text.length > 12000) refuse("Arguments are too large to show in a confirmation; no changes were made.");
  return text;
}
