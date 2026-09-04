import { type AddTeamMemberRequest, pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { teamMemberRole } from "./schemas";

const description = `
Add a user to a Team by email address and assign their Team role.
`.trim();

export default registerTool({
  name: "add-team-member",
  title: "Add Team Member",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    team_token: vantageToken("team"),
    user_email: z.email().describe("Email address of the user to add to the Team."),
    role: teamMemberRole.optional().default("editor").describe("Team role, defaults to editor."),
  },
  async execute(args, ctx) {
    const { team_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/teams/${pathEncode(team_token)}/members`,
      body as AddTeamMemberRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
