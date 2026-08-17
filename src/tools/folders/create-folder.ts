import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { folderType } from "./schemas";

const description = `
Create a folder for organizing Cost Reports or Resource Reports. Set type to ProviderResourceFolder for Resource Reports; omit it to create the default CostFolder.
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
    type: folderType
      .optional()
      .describe("Folder type. Set to ProviderResourceFolder for Resource Reports; omit for the default CostFolder."),
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
