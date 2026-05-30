import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import type z from "zod";
import type { AppEnv } from "../../env";
import { tracer, type WaitUntil } from "../../tracing";
import MCPUserError from "./MCPUserError";

export type ToolCallContext = {
  env?: AppEnv;
  waitUntil?: WaitUntil;
  callVantageApi: <
    P extends Path,
    M extends SupportedMethods<P>,
    Request extends RequestBodyForPathAndMethod<P, M>,
    Response extends ResponseBodyForPathAndMethod<P, M>,
  >(
    endpoint: P,
    params: Request,
    method: M
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

const toolSetups = new Map<string, (server: McpServer, generateContext: () => ToolCallContext) => void>();

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
  const serverSetup = (server: McpServer, generateContext: () => ToolCallContext) => {
    server.registerTool(
      toolProps.name,
      {
        title: toolProps.title,
        description: toolProps.description,

        // I don't like this, but it is handled by the higher level type system.
        inputSchema: toolProps.args as any,

        outputSchema: toolProps.outputSchema,
        annotations: {
          readOnlyHint: toolProps.annotations.readOnly,
          openWorldHint: toolProps.annotations.openWorld,
          destructiveHint: toolProps.annotations.destructive,
        },
      },

      async (args: any, extra: RequestHandlerExtra<ServerRequest, ServerNotification>): Promise<any> => {
        const ctx = generateContext();
        const rawHeaders = extra?.requestInfo?.headers as HeadersInit | undefined;
        const headers = rawHeaders ? new Headers(rawHeaders) : undefined;
        const parent = tracer.extractTraceContext(headers);
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
              ...(source ? { "mcp.source": source } : {}),
            },
          },
          async () => {
            try {
              const res = await toolProps.execute(args, ctx);

              if (toolProps.outputSchema) {
                // Since there's an output schema, we should return structured content.
                return {
                  structuredContent: res,
                };
              }

              // There's no output schema, so we should return text content.
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(res, null, 2),
                  },
                ],
                isError: false,
              };
            } catch (e) {
              if (e instanceof MCPUserError) {
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

export function setupRegisteredTools(server: McpServer, generateContext: () => ToolCallContext) {
  for (const setup of toolSetups.values()) {
    setup(server, generateContext);
  }
}
