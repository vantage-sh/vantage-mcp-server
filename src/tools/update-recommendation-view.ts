import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Updates an existing recommendation view. Use this to change the title or filters applied to saved recommendation views.
`.trim();

export default registerTool({
  name: "update-recommendation-view",
  title: "Update Recommendation View",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    recommendation_view_token: z.string().describe("The token of the recommendation view to update"),
    title: z.string().optional().describe("New title"),
    provider_ids: z.array(z.string()).optional().describe("Provider IDs to filter"),
    billing_account_ids: z.array(z.string()).optional().describe("Billing account IDs to filter"),
    account_ids: z.array(z.string()).optional().describe("Account IDs to filter"),
    regions: z.array(z.string()).optional().describe("Regions to filter"),
    tag_key: z.string().optional().describe("Tag key to filter"),
    tag_value: z.string().optional().describe("Tag value to filter"),
    start_date: z.string().optional().describe("Start date"),
    end_date: z.string().optional().describe("End date"),
  },
  async execute(args, ctx) {
    const { recommendation_view_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/recommendation_views/${pathEncode(recommendation_view_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
