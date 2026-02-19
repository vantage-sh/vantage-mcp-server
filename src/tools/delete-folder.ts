import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Deletes a Folder. Cost Reports within the Folder will not be deleted.
`.trim();

export default registerTool({
	name: "delete-folder",
	description,
	annotations: {
		destructive: true,
		openWorld: false,
		readOnly: false,
	},
	args: {
		folder_token: z.string().describe("The token of the folder to delete"),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi(
			`/v2/folders/${pathEncode(args.folder_token)}`,
			{},
			"DELETE"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
