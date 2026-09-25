import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

export default registerTool({
  name: "list-saved-filters",
  title: "List Saved Filters",
  description: "List Saved Filters that can be applied to Cost Reports, optionally searching by title or Workspace.",
  annotations: { readOnly: true, destructive: false, openWorld: false },
  args: {
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
    q: nonempty().optional().describe("Search Saved Filters by title."),
    workspace_token: vantageToken("workspace", {
      description: "Only return Saved Filters in this Workspace.",
    }).optional(),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/saved_filters", { ...args, limit: DEFAULT_LIMIT }, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { saved_filters: response.data.saved_filters, pagination: paginationData(response.data) };
  },
});
