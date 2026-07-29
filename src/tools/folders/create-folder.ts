import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Create a Folder for organizing Cost Reports. Folders can be nested by specifying a parent_folder_token.
SavedFilters can be applied to the Folder so that any Cost Report within it inherits those filters.
`.trim();

export default registerTool({
  name: "create-folder",
  title: "Create Folder",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("The title of the Folder."),
    parent_folder_token: vantageToken("folder", {
      description: "Parent Folder to nest this Folder under.",
    }).optional(),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
      .optional()
      .describe("The tokens of SavedFilters to apply to any Cost Report contained within the Folder."),
    workspace_token: vantageToken("workspace", {
      description:
        "Ignored if parent_folder_token is set. Required if the API token is associated with multiple Workspaces.",
    }).optional(),
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi("/v2/folders", args, "POST");
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
