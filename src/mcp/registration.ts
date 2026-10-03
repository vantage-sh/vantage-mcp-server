import type { ResourceMetadata, ToolAnnotations } from "@modelcontextprotocol/server";
import type z from "zod";

// Only definitions and plain request data cross this boundary. Hosted McpAgent
// keeps its own SDK v1 server/transports until the stateless migration.
export type ToolRequestContext = {
  signal?: AbortSignal;
  _meta?: Record<string, unknown>;
  requestInfo?: { headers?: Record<string, string | string[] | undefined> };
  mcpReq?: { signal: AbortSignal; _meta?: Record<string, unknown> };
  http?: { req?: Request };
};

export type ToolHandle = { disable(): void };

export type ToolRegistrationHost = {
  registerTool(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema: z.ZodObject;
      outputSchema?: z.ZodObject;
      annotations: ToolAnnotations;
    },
    callback: (args: any, context: ToolRequestContext) => Promise<any>
  ): ToolHandle;
};

export type ResourceRegistrationHost = {
  registerResource(
    name: string,
    uri: string,
    metadata: ResourceMetadata,
    callback: () => { contents: { uri: string; text: string; mimeType: string }[] }
  ): unknown;
};
