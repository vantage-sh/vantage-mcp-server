import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete a Team.
`.trim();

export default registerTool({
  name: "delete-team",
  title: "Delete Team",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    team_token: vantageToken("team"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/teams/${pathEncode(args.team_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.team_token };
  },
});
