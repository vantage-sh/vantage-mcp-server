import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { workspaceResponseSchema } from "../workspaces/schemas";

const description = `
Get data that is available to the current auth token.
This includes the list of Workspaces they have access to.

default_workspace_token: The token of the workspace that is set as the default for the user and can be used for queries unless told otherwise.
`.trim();

const args = {};

export default registerTool({
  name: "get-myself",
  title: "Get Current User",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  outputSchema: {
    default_workspace_token: z.string().nullable().describe("The default Workspace token to use for queries."),
    default_dashboard_token: z.string().nullish().describe("The token of the User's default Dashboard."),
    workspaces: z.array(workspaceResponseSchema).describe("The Workspaces accessible to the current auth token."),
    bearer_token: z
      .object({
        description: z.string().describe("The user-supplied description of the Bearer Token."),
        created_at: z.string().describe("When the Bearer Token was created, in UTC ISO 8601 format."),
        scope: z.array(z.string()).describe("The scopes applied to the Bearer Token."),
      })
      .describe("Metadata for the Bearer Token authenticating this request."),
    is_account_owner: z
      .boolean()
      .describe("Whether the authenticated User or Token has the Owner role on the Account."),
  },
  async execute(_, ctx) {
    const response = await ctx.callVantageApi("/v2/me", {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
