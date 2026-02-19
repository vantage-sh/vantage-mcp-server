import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Updates a Folder for organizing Cost Reports. You can update its title, move it to a different parent Folder, or change its SavedFilter tokens.
`.trim();

export default registerTool({
	name: "update-folder",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: false,
	},
	args: {
		folder_token: z.string().describe("The token of the folder to update"),
		title: z.string().optional().describe("Updated title for the Folder"),
		parent_folder_token: z
			.string()
			.optional()
			.describe("Updated parent folder token for nesting"),
		saved_filter_tokens: z
			.array(z.string())
			.optional()
			.describe(
				"Updated tokens of SavedFilters to apply to any Cost Report contained within the Folder"
			),
	},
	async execute(args, ctx) {
		const { folder_token, ...body } = args;
		const response = await ctx.callVantageApi(
			`/v2/folders/${pathEncode(folder_token)}`,
			body,
			"PUT"
		);
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return response.data;
	},
});
