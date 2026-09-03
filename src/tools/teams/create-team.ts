import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
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
Create a Team and optionally associate it with Workspaces, users, and a default Dashboard.
`.trim();

type CreateTeamRequest = RequestBodyForPathAndMethod<"/v2/teams", "POST">;

export default registerTool({
  name: "create-team",
  title: "Create Team",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    name: teamName.describe("Team name."),
    description: teamDescription.optional().describe("Team description."),
    workspace_tokens: teamWorkspaceTokens.optional().describe("Workspaces to associate with the Team."),
    user_tokens: teamUserTokens.optional().describe("Existing users to associate with the Team."),
    user_emails: teamUserEmails.optional().describe("User email addresses to associate with the Team."),
    role: teamRole.optional().describe("Role to assign to the provided users. The Vantage API defaults to editor."),
    default_dashboard_token: teamDefaultDashboardToken
      .optional()
      .describe("Dashboard to set as the Team default. Send null for no default Dashboard."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/teams", args as CreateTeamRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
