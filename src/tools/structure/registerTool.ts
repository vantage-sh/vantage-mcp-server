import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

export type ToolProperties<
	Input extends z.ZodRawShape,
	Output extends z.ZodRawShape | undefined = undefined,
> = {
	name: string;
	description: string;
	annotations: {
		readOnly: boolean;
		openWorld: boolean;
		destructive: boolean;
	};
	args: Input;
	outputSchema?: Output;

	execute: (
		args: z.core.$InferObjectOutput<{ -readonly [P in keyof Input]: Input[P] }, {}>,
		context: ToolCallContext
	) => Promise<
		Output extends undefined
			? Record<string, unknown>
			: z.core.$InferObjectOutput<{ -readonly [P in keyof Output]: Output[P] }, {}>
	>;
};

const toolSetups = new Map<
	string,
	(server: McpServer, generateContext: () => ToolCallContext) => void
>();

export function clearRegisteredToolsForTesting() {
	toolSetups.clear();
}

export default function registerTool<Input extends z.ZodRawShape>(
	toolProps: ToolProperties<Input, undefined>
): ToolProperties<Input, undefined>;
export default function registerTool<Input extends z.ZodRawShape, Output extends z.ZodRawShape>(
	toolProps: ToolProperties<Input, Output>
): ToolProperties<Input, Output>;
export default function registerTool<
	Input extends z.ZodRawShape,
	Output extends z.ZodRawShape | undefined,
>(toolProps: ToolProperties<Input, Output>): ToolProperties<Input, Output> {
	const serverSetup = (server: McpServer, generateContext: () => ToolCallContext) => {
		server.registerTool(
			toolProps.name,
			{
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

			// We use any here to handle the ambiguity of the output schema.
			async (args: any): Promise<any> => {
				try {
					const res = await toolProps.execute(args, generateContext());

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
