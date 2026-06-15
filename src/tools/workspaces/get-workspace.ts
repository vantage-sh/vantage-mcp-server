import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Workspace by its token. Workspaces are isolated environments within Vantage for organizing cost data and access control across teams.
`.trim();

const args = {
  workspace_token: z.string().describe("The token of the workspace to retrieve"),
};

export default registerTool({
  name: "get-workspace",
  title: "Get Workspace",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/workspaces/${pathEncode(args.workspace_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
