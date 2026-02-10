import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all Folders for organizing Cost Reports. Folders can be nested within other Folders via the parent_folder_token field.
When you first call this function, use the "page" parameter of 1.
The 'title' of a Folder describes its purpose.
The 'saved_filter_tokens' field contains tokens of SavedFilters applied to Cost Reports within the Folder.
The 'token' of a Folder can be used to generate a link in the Vantage Web UI: https://console.vantage.sh/go/<token>
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
	name: "list-folders",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/folders", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			folders: response.data.folders,
			pagination: paginationData(response.data),
		};
	},
});
