import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
	Path,
	RequestBodyForPathAndMethod,
	ResponseBodyForPathAndMethod,
	SupportedMethods,
} from "@vantage-sh/vantage-client";
import type z from "zod/v4";
import MCPUserError from "./MCPUserError";
export type ToolCallContext = {
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

export type ToolProperties<Validators extends z.ZodRawShape> = {
	name: string;
	description: string;
	annotations: {
		readOnly?: boolean;
		openWorld?: boolean;
		destructive?: boolean;
	};
	args: Validators;
	execute: (
		args: z.core.$InferObjectOutput<{ -readonly [P in keyof Validators]: Validators[P] }, {}>,
		context: ToolCallContext
	) => Promise<Record<string, unknown>>;
};

const toolSetups = new Map<
	string,
	(server: McpServer, generateContext: () => ToolCallContext) => void
>();

export function clearRegisteredToolsForTesting() {
	toolSetups.clear();
}

export default function registerTool<Validators extends z.ZodRawShape>(
	toolProps: ToolProperties<Validators>
) {
	const serverSetup = (server: McpServer, generateContext: () => ToolCallContext) => {
		server.tool(
			toolProps.name,
			toolProps.description,

			// I don't like this, but it gets us out of type hell for now,
			// and we type the tool anyway, so its not as bad as it could be.
			toolProps.args as any,
			{
				readOnlyHint: toolProps.annotations.readOnly ?? false,
				openWorldHint: toolProps.annotations.openWorld ?? false,
				destructiveHint: toolProps.annotations.destructive ?? true,
			},
			async (args: any): Promise<CallToolResult> => {
				try {
					const res = await toolProps.execute(args, generateContext());
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
	};

	if (toolSetups.has(toolProps.name)) {
		throw new Error(`Tool ${toolProps.name} is already registered`);
	}

	toolSetups.set(toolProps.name, serverSetup);

	return toolProps;
}

export function setupRegisteredTools(server: McpServer, generateContext: () => ToolCallContext) {
	for (const setup of toolSetups.values()) {
		setup(server, generateContext);
	}
}
