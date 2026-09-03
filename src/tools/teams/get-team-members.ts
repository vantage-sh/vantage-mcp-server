import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Return the members of a Team, including each user's name, email, token, and Team role.
`.trim();

export default registerTool({
  name: "get-team-members",
  title: "Get Team Members",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    team_token: vantageToken("team"),
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/teams/${pathEncode(args.team_token)}/members`,
      { page: args.page, limit: DEFAULT_LIMIT },
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      members: response.data.members,
      pagination: paginationData(response.data),
    };
  },
});
