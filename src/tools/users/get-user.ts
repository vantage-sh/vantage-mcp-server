import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific User by their token. Use get-users to discover user tokens in the workspace.
`.trim();

export default registerTool({
  name: "get-user",
  title: "Get User",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    user_token: z.string().describe("The token of the user to retrieve."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/users/${pathEncode(args.user_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
