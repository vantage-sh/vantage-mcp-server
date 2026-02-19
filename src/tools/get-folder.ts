import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific Folder by its token.
`.trim();

export default registerTool({
	name: "get-folder",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args: {
		folder_token: z.string().describe("The token of the folder to retrieve"),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/folders/${pathEncode(args.folder_token)}`,
			{},
			"GET"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
