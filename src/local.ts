import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { callApi, serverMeta } from "./shared";
import { setupRegisteredTools, type ToolCallContext } from "./tools/structure/registerTool";

// Side effect import to register all tools
import "./tools";

async function main() {
	if (!process.env.VANTAGE_TOKEN) {
		throw new Error("VANTAGE_TOKEN environment variable is required.");
	}

	const ctx: ToolCallContext = {
		callVantageApi: async (endpoint, params, method) => {
			const headers: Record<string, string> = {
				Authorization: `Bearer ${process.env.VANTAGE_TOKEN}`,
			};

			return callApi(
				process.env.VANTAGE_API_HOST || "https://api.vantage.sh",
				headers,
				params,
				method,
				endpoint
			);
		},
	};

	const stdio = new StdioServerTransport();
	const server = new McpServer(serverMeta);
	setupRegisteredTools(server, () => ctx);

	await server.connect(stdio);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
