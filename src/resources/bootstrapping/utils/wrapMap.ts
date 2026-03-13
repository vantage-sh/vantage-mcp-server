import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export default function wrapMap(
	m: Map<
		string,
		{
			content: string;
			title: string | undefined;
			description: string | undefined;
		}
	>
) {
	return (s: McpServer) => {
		for (const [key, value] of m.entries()) {
			const uri = `file://vantage/${key}`;
			s.registerResource(
				key,
				uri,
				{
					mimeType: "text/markdown",
					annotations: {
						audience: ["assistant", "user"],
					},
					title: value.title,
					description: value.description,
				},
				() => {
					return {
						contents: [
							{
								uri,
								text: value.content,
								mimeType: "text/markdown",
							},
						],
					};
				}
			);
		}
	};
}
