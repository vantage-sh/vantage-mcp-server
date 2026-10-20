import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { folderType } from "./schemas";

const description = `
Create a Folder for organizing Cost Reports, Dashboards, or Resource Reports.
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
    type: folderType.describe(
      "Folder type: CostFolder for Cost Reports, DashboardFolder for Dashboards, or ProviderResourceFolder for Resource Reports."
    ),
    parent_folder_token: vantageToken("folder", {
      description: "Parent Folder to nest this Folder under. Must have the same type as this Folder.",
    }).optional(),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
      .optional()
      .describe("Saved Filter tokens to apply to contained Cost Reports. Only applies to CostFolder."),
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
