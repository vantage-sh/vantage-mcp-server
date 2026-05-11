import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List all recommendation views available in the Vantage account. Recommendation views are saved filters for cost optimization recommendations.
Use the page value of 1 to start.
`.trim();

const args = {
  page: z.number().optional().describe("Page number"),
  limit: z.number().optional().describe("Number of results per page"),
};

export default registerTool({
  name: "list-recommendation-views",
  title: "List Recommendation Views",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/recommendation_views", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      recommendation_views: response.data.recommendation_views,
      pagination: paginationData(response.data),
    };
  },
});
