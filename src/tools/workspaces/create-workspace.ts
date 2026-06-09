import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Create a new Workspace in Vantage. Workspaces are isolated environments for organizing cost data and access control across teams.
`.trim();

export default registerTool({
  name: "create-workspace",
  title: "Create Workspace",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    name: z.string().describe("Name of the workspace"),
    enable_currency_conversion: z.boolean().optional().describe("Enable currency conversion for the workspace"),
    currency: z.string().optional().describe('Currency code for the workspace (e.g., "USD")'),
    exchange_rate_date: z
      .enum(["daily_rate", "end_of_billing_period_rate"])
      .optional()
      .describe("The date to use for currency conversion"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/workspaces", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
