import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { filter, title } from "./schemas";

export default registerTool({
  name: "create-saved-filter",
  title: "Create Saved Filter",
  description: "Create a Saved Filter for reuse across Cost Reports. The filter uses VQL syntax.",
  annotations: { readOnly: false, destructive: false, openWorld: false },
  args: {
    title,
    workspace_token: vantageToken("workspace", {
      description: "Workspace for the Saved Filter; required for API tokens with multiple Workspaces.",
    }).optional(),
    filter: filter.optional(),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/saved_filters", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
