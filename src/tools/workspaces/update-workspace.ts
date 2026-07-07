import { pathEncode, type UpdateWorkspaceRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Update an existing Workspace. You can update the name, currency conversion settings, currency code, and exchange rate date method.
`.trim();

export default registerTool({
  name: "update-workspace",
  title: "Update Workspace",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: z.string().describe("The token of the workspace to update"),
    name: z.string().optional().describe("New name for the workspace"),
    enable_currency_conversion: z.boolean().optional().describe("Enable currency conversion for the workspace"),
    currency: z.string().optional().describe('Currency code for the workspace (e.g., "USD")'),
    exchange_rate_date: z
      .enum(["daily_rate", "end_of_billing_period_rate"])
      .optional()
      .describe("The date to use for currency conversion"),
  },
  async execute(args, ctx) {
    const { workspace_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/workspaces/${pathEncode(workspace_token)}`,
      body as UpdateWorkspaceRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
