import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific recommendation view by its token.

Use this tool when you already have a recommendation view token, such as one returned by Vantage or
referenced in the Vantage console. The response includes the view's title, workspace, date range,
provider and account scopes, regions, tags, creation timestamp, and creator.
`.trim();

const args = {
  recommendation_view_token: z.string().min(1).describe("The recommendation view token to retrieve"),
};

export default registerTool({
  name: "get-recommendation-view",
  title: "Get Recommendation View",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/recommendation_views/${pathEncode(args.recommendation_view_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
