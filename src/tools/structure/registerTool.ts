import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import z from "zod";
import type { AppEnv } from "../../env";
import type { MutationConfirmation } from "../../mcp/confirm-mutation";
import { CONFIRMATION_HEADER, parseConfirmationPolicy, requiresConfirmation } from "../../mcp/confirmation-policy";
import type { ToolHandle, ToolRegistrationHost, ToolRequestContext } from "../../mcp/registration";
import {
  formatErrorsForTelemetry,
  TRACE_STATUS_MESSAGE_MAX_LENGTH,
  tracer,
  truncateAttribute,
  type WaitUntil,
} from "../../tracing";
import { mcpTraceContext } from "../../tracing/mcp-context";
import MCPUserError from "./MCPUserError";

export type ToolCallContext = {
  env?: AppEnv;
  waitUntil?: WaitUntil;
  signal?: AbortSignal;
  confirmMutation?: MutationConfirmation;
  callVantageApi: <
    P extends Path,
    M extends SupportedMethods<P>,
    Request extends RequestBodyForPathAndMethod<P, M>,
    Response extends ResponseBodyForPathAndMethod<P, M>,
  >(
    endpoint: P,
    params: Request,
    method: M,
    signal?: AbortSignal
  ) => Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }>;
};

export type ToolProperties<Input extends z.ZodRawShape, Output extends z.ZodRawShape | undefined = undefined> = {
  name: string;
  title: string;
  description: string;
  annotations: {
    readOnly: boolean;
    openWorld: boolean;
    destructive: boolean;
  };
  args: Input;
  outputSchema?: Output;

  execute: (
    args: z.core.$InferObjectOutput<{ -readonly [P in keyof Input]: Input[P] }, Record<string, unknown>>,
    context: ToolCallContext
  ) => Promise<
    Output extends undefined
      ? Record<string, unknown>
      : z.core.$InferObjectInput<{ -readonly [P in keyof Output]: Output[P] }, Record<string, unknown>>
  >;
};

const toolSetups = new Map<
  string,
  (server: ToolRegistrationHost, generateContext: () => ToolCallContext) => ToolHandle
>();

export type ToolMetadata = Pick<
  ToolProperties<z.ZodRawShape, z.ZodRawShape | undefined>,
  "name" | "title" | "description" | "annotations" | "args" | "outputSchema"
>;
const toolDefinitions = new Map<string, ToolMetadata>();

export function clearRegisteredToolsForTesting() {
  toolSetups.clear();
  toolDefinitions.clear();
}

export function getRegisteredTool(name: string): ToolMetadata | undefined {
  return toolDefinitions.get(name);
}

export function getRegisteredToolNames(): string[] {
  return Array.from(toolDefinitions.keys());
}

export default function registerTool<Input extends z.ZodRawShape>(
  toolProps: ToolProperties<Input, undefined>
): ToolProperties<Input, undefined>;
export default function registerTool<Input extends z.ZodRawShape, Output extends z.ZodRawShape>(
  toolProps: ToolProperties<Input, Output>
): ToolProperties<Input, Output>;
export default function registerTool<Input extends z.ZodRawShape, Output extends z.ZodRawShape | undefined>(
  toolProps: ToolProperties<Input, Output>
): ToolProperties<Input, Output> {
  const serverSetup = (server: ToolRegistrationHost, generateContext: () => ToolCallContext) => {
    return server.registerTool(
      toolProps.name,
      {
        title: toolProps.title,
        description: toolProps.description,

        inputSchema: z.object(toolProps.args),

        outputSchema: toolProps.outputSchema ? z.object(toolProps.outputSchema) : undefined,
        annotations: {
          readOnlyHint: toolProps.annotations.readOnly,
          openWorldHint: toolProps.annotations.openWorld,
          destructiveHint: toolProps.annotations.destructive,
        },
      },

      async (args: any, extra: ToolRequestContext): Promise<any> => {
        const baseContext = generateContext();
        const signal = extra?.mcpReq?.signal ?? extra?.signal;
        const ctx: ToolCallContext = signal
          ? {
              ...baseContext,
              signal,
              callVantageApi: (endpoint, params, method) => {
                signal.throwIfAborted();
                return baseContext.callVantageApi(endpoint, params, method, signal);
              },
            }
          : baseContext;
        const legacyHeaders = extra?.requestInfo?.headers;
        const rawHeaders =
          extra?.http?.req?.headers ??
          (legacyHeaders
            ? Object.fromEntries(
                Object.entries(legacyHeaders)
                  .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
                  .map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value])
              )
            : undefined);
        const headers = rawHeaders ? new Headers(rawHeaders) : undefined;
        const parent = mcpTraceContext(extra?.mcpReq?._meta ?? extra?._meta, headers);
        const source = headers?.get("x-trace-source") ?? undefined;

        return tracer.runWithSpan(
          `tool/${toolProps.name}`,
          {
            env: ctx.env,
            waitUntil: ctx.waitUntil,
            kind: "server",
            parent,
            attributes: {
              "mcp.tool.name": toolProps.name,
              "mcp.method.name": "tools/call",
              ...(source ? { "mcp.source": source } : {}),
            },
          },
          async (span) => {
            try {
              signal?.throwIfAborted();
              if (ctx.confirmMutation) {
                const pending = await ctx.confirmMutation(toolProps, args, extra);
                if (pending) return pending;
              } else if (headers?.has(CONFIRMATION_HEADER)) {
                let policy: ReturnType<typeof parseConfirmationPolicy>;
                try {
                  policy = parseConfirmationPolicy(headers.get(CONFIRMATION_HEADER), getRegisteredToolNames());
                } catch (error) {
                  throw new MCPUserError({ errors: [{ message: (error as Error).message }] });
                }
                if (requiresConfirmation(policy, toolProps.name)) {
                  throw new MCPUserError({
                    errors: [{ message: "Requested confirmations require the SDK v2 runtime; no changes were made." }],
                  });
                }
              }
              signal?.throwIfAborted();
              const res = await toolProps.execute(args, ctx);
              signal?.throwIfAborted();

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(res, null, 2),
                  },
                ],
                ...(toolProps.outputSchema ? { structuredContent: res } : {}),
                isError: false,
              };
            } catch (e) {
              if (e instanceof MCPUserError) {
                const message = formatErrorsForTelemetry(e.exception);
                span.status = {
                  code: 2,
                  message: truncateAttribute(message, TRACE_STATUS_MESSAGE_MAX_LENGTH),
                };
                span.attributes["error.message"] = message;
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(e.exception, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              throw e;
            }
          }
        );
      }
    );
  };

  if (toolSetups.has(toolProps.name)) {
    throw new Error(`Tool ${toolProps.name} is already registered`);
  }

  toolSetups.set(toolProps.name, serverSetup);
  toolDefinitions.set(toolProps.name, toolProps);

  return toolProps;
}

export function setupRegisteredTools(
  server: ToolRegistrationHost,
  generateContext: () => ToolCallContext
): Map<string, ToolHandle> {
  const registered = new Map<string, ToolHandle>();
  for (const [name, setup] of toolSetups) {
    registered.set(name, setup(server, generateContext));
  }
  return registered;
}
