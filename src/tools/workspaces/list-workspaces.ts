import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List all Workspaces available to the authenticated API token. Workspaces are isolated environments within Vantage for organizing cost data and access control across teams.

Use get-myself to see the user's default workspace. Use get-workspace to retrieve details for a specific workspace.
`.trim();

const args = {
  page: z.number().optional().describe("The page number to return"),
  limit: z.number().optional().describe("The number of results to return per page"),
};

export default registerTool({
  name: "list-workspaces",
  title: "List Workspaces",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/workspaces", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      workspaces: response.data.workspaces,
      pagination: paginationData(response.data),
    };
  },
});
