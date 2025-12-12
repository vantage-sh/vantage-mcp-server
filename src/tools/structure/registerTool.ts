import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type z from "zod";
import MCPUserError from "./MCPUserError";

export type AllowedMethods = "GET" | "POST" | "PUT";

export type ToolCallContext = {
	callVantageApi: (
		endpoint: string,
		params: Record<string, unknown>,
		method: AllowedMethods
	) => Promise<{ data: any; ok: true } | { errors: unknown[]; ok: false }>;
};

export type ToolProperties<Validators extends z.ZodRawShape> = {
	name: string;
	description: string;
	args: Validators;
	execute: (
		args: {
			[K in keyof Validators]: z.infer<Validators[K]>;
		},
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

	toolSetups.set(toolProps.name, serverSetup);

	return toolProps;
}

export function setupRegisteredTools(server: McpServer, generateContext: () => ToolCallContext) {
	for (const setup of toolSetups.values()) {
		setup(server, generateContext);
	}
}
