import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

export const teamName = nonempty();
export const teamDescription = nonempty();
export const teamWorkspaceTokens = z.array(vantageToken("workspace"));
export const teamUserTokens = z.array(vantageToken("user"));
export const teamUserEmails = z.array(z.email());
export const teamRole = z.enum(["owner", "editor", "viewer"]);
export const teamDefaultDashboardToken = vantageToken("dashboard").nullable();
export const teamMemberRole = z.enum(["owner", "editor", "viewer", "integration_owner"]);

// Output schemas mirror the Vantage client response types.
export const teamMemberResponseSchema = z.object({
  name: z.string().describe("The name of the team member."),
  email: z.string().describe("The email address of the team member."),
  user_token: z.string().describe("The token of the team member."),
  role: z.string().describe("The role of the team member in the team."),
});

export const teamResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  name: z.string().describe("The name of the Team."),
  description: z.string().nullable().describe("The description of the Team."),
  workspace_tokens: z.array(z.string()).describe("The tokens for any Workspaces that the Team belongs to"),
  user_emails: z.array(z.string()).describe("The email addresses for Users that belong to the Team"),
  user_tokens: z.array(z.string()).describe("The tokens for Users that belong to the Team"),
  default_dashboard_token: z.string().nullable().describe("The token of the default Dashboard for the Team."),
});

export const getTeamMembersResponseSchema = z.object({
  members: z.array(teamMemberResponseSchema).describe("Members."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const getTeamsResponseSchema = z.object({
  teams: z.array(teamResponseSchema).describe("Teams."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const removeTeamMemberResponseSchema = z.object({
  team_token: z.string().describe("Team token."),
  user_token: z.string().describe("User token."),
});

export const teamMemberOutputSchema = teamMemberResponseSchema.shape;

export const teamOutputSchema = teamResponseSchema.shape;

export const getTeamMembersOutputSchema = getTeamMembersResponseSchema.shape;

export const getTeamsOutputSchema = getTeamsResponseSchema.shape;

export const removeTeamMemberOutputSchema = removeTeamMemberResponseSchema.shape;
