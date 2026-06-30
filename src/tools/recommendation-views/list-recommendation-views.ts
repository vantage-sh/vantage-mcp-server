import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List all recommendation views available in the Vantage account. Recommendation views are saved filters for cost optimization recommendations.
Use the page value of 1 to start.
The title of a recommendation view is a good way to understand what optimization scope it represents.
The token of a recommendation view is its unique identifier and can be used to link the user to the view in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<token>
The workspace token, date range, providers, accounts, regions, and tag fields provide additional context about which recommendations are included in the view.
`.trim();

const args = {
  page: z.number().int().min(1).optional().default(1).describe("The page number to return, defaults to 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe(`The number of results per page. Defaults to ${DEFAULT_LIMIT}. The maximum is 1000.`),
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
    const requestParams = { ...args, limit: args.limit ?? DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/recommendation_views", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      recommendation_views: response.data.recommendation_views,
      pagination: paginationData(response.data),
    };
  },
});
