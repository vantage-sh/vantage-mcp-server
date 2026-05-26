import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a recommendation view by its token. This action is irreversible.
`.trim();

const args = {
  recommendation_view_token: z.string().describe("The token of the recommendation view to delete"),
};

export default registerTool({
  name: "delete-recommendation-view",
  title: "Delete Recommendation View",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/recommendation_views/${pathEncode(args.recommendation_view_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.recommendation_view_token };
  },
});
