import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";

export const teamName = nonempty();
export const teamDescription = nonempty();
export const teamWorkspaceTokens = z.array(vantageToken("workspace"));
export const teamUserTokens = z.array(vantageToken("user"));
export const teamUserEmails = z.array(z.email());
export const teamRole = z.enum(["owner", "editor", "viewer"]);
export const teamDefaultDashboardToken = vantageToken("dashboard").nullable();
export const teamMemberRole = z.enum(["owner", "editor", "viewer", "integration_owner"]);
