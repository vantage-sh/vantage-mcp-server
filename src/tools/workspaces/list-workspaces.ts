import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List all Workspaces available to the authenticated API token. Workspaces are isolated environments within Vantage for organizing cost data and access control across teams.

Use get-myself to see the user's default workspace. Use get-workspace to retrieve details for a specific workspace.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  limit: z.number().optional().describe(`The number of results to return per page, defaults to ${DEFAULT_LIMIT}`),
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
    const requestParams = { ...args, limit: args.limit ?? DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/workspaces", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      workspaces: response.data.workspaces,
      pagination: paginationData(response.data),
    };
  },
});
