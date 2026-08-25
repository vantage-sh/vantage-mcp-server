import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Updates a Folder's title, parent, or SavedFilter tokens. Folder type cannot be changed after creation.
`.trim();

export default registerTool({
  name: "update-folder",
  title: "Update Folder",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    folder_token: vantageToken("folder"),
    title: z.string().optional().describe("Updated title for the Folder"),
    parent_folder_token: vantageToken("folder", {
      description: "Updated parent Folder for nesting.",
    }).optional(),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
      .optional()
      .describe("Updated tokens of SavedFilters to apply to any Cost Report contained within the Folder"),
  },
  async execute(args, ctx) {
    const { folder_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/folders/${pathEncode(folder_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
