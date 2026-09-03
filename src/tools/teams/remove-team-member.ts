import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Remove a user from a Team without deleting the user.
`.trim();

export default registerTool({
  name: "remove-team-member",
  title: "Remove Team Member",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    team_token: vantageToken("team"),
    user_token: vantageToken("user"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/teams/${pathEncode(args.team_token)}/members/${pathEncode(args.user_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { team_token: args.team_token, user_token: args.user_token };
  },
});
