import { pathEncode, type UpdateTeamRequest } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  teamDefaultDashboardToken,
  teamDescription,
  teamName,
  teamRole,
  teamUserEmails,
  teamUserTokens,
  teamWorkspaceTokens,
} from "./schemas";

const description = `
Update a Team's name, description, Workspace and user associations, user role, or default Dashboard.
`.trim();

export default registerTool({
  name: "update-team",
  title: "Update Team",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    team_token: vantageToken("team"),
    name: teamName.optional().describe("Updated Team name."),
    description: teamDescription.optional().describe("Updated Team description."),
    workspace_tokens: teamWorkspaceTokens.optional().describe("Updated Workspaces associated with the Team."),
    user_tokens: teamUserTokens.optional().describe("Updated existing users associated with the Team."),
    user_emails: teamUserEmails.optional().describe("Updated user email addresses associated with the Team."),
    role: teamRole.optional().describe("Role to assign to the provided users. The Vantage API defaults to editor."),
    default_dashboard_token: teamDefaultDashboardToken
      .optional()
      .describe("Updated default Dashboard. Send null to clear the default Dashboard."),
  },
  async execute(args, ctx) {
    const { team_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/teams/${pathEncode(team_token)}`, body as UpdateTeamRequest, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
