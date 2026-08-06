import { nonempty } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Returns all Virtual Tag Configs the current API token can access, including their values. Use this to discover config and value tokens; optionally search by tag key.
`.trim();

export default registerTool({
  name: "list-virtual-tag-configs",
  title: "List Virtual Tag Configs",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    q: nonempty().optional().describe("Search query that filters Virtual Tag Configs by key."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/virtual_tag_configs", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
