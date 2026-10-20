import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Updates a Cost Report, Dashboard, or Resource Report Folder's title or parent, or a Cost Folder's Saved Filters. Folder type cannot be changed after creation.
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
      description: "Updated parent Folder for nesting. Must have the same type and Workspace as this Folder.",
    })
      .or(z.literal(""))
      .nullable()
      .optional()
      .describe(
        "Updated parent Folder token (fldr_*). Must have the same type and Workspace. Send null or an empty string to move to root; omit to keep the current parent."
      ),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
      .nullable()
      .optional()
      .describe(
        "Saved Filter tokens for contained Cost Reports; only applies to CostFolder. Send null or an empty array to clear; omit to keep current filters."
      ),
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
