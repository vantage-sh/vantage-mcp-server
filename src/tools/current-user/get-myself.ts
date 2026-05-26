import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get data that is available to the current auth token.
This includes the list of Workspaces they have access to.
`.trim();

const args = {};

const workspaceSchema = z.object({
  token: z.string(),
  name: z.string().describe("Human-readable name of the workspace"),
  created_at: z.string().describe("ISO 8601 timestamp of workspace creation"),
  enable_currency_conversion: z.boolean(),
  currency: z.string().describe("ISO 4217 currency code (e.g. USD)"),
  exchange_rate_date: z.string().describe("Date used to convert currency for cost data"),
});

const bearerTokenSchema = z.object({
  description: z.string().describe("User-supplied description of the bearer token"),
  created_at: z.string().describe("ISO 8601 timestamp of token creation"),
  scope: z.array(z.string()).describe("Scopes applied to the bearer token used for this request"),
});

const outputSchema = {
  default_workspace_token: z
    .string()
    .nullable()
    .describe("Token of the workspace to use for queries unless otherwise specified. May be null."),
  workspaces: z.array(workspaceSchema).describe("Workspaces the authenticated token has access to"),
  bearer_token: bearerTokenSchema,
};

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
  outputSchema,
  async execute(_, ctx) {
    const response = await ctx.callVantageApi("/v2/me", {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
