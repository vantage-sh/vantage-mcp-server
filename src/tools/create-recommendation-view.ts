import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Create a recommendation view in Vantage for saved recommendation filters.
`.trim();

export default registerTool({
  name: "create-recommendation-view",
  title: "Create Recommendation View",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().describe("Title of the recommendation view."),
    workspace_token: z.string().describe("Token of the workspace."),
    provider_ids: z.array(z.string()).optional().describe("Provider IDs to filter."),
    billing_account_ids: z.array(z.string()).optional().describe("Billing account IDs to filter."),
    account_ids: z.array(z.string()).optional().describe("Account IDs to filter."),
    regions: z.array(z.string()).optional().describe("Regions to filter."),
    tag_key: z.string().optional().describe("Tag key to filter."),
    tag_value: z.string().optional().describe("Tag value to filter."),
    start_date: z.string().optional().describe("Start date."),
    end_date: z.string().optional().describe("End date."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/recommendation_views", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
