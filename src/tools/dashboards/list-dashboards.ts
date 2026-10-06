import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Lists Dashboards. Start at page 1. A dashboard token links to https://console.vantage.sh/go/<token>. For scheduled dashboard emails, use list-dashboard-notifications.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  q: nonempty().optional().describe("Search Dashboards by title."),
  workspace_token: vantageToken("workspace", {
    description: "Only return Dashboards in this Workspace.",
  }).optional(),
};

export default registerTool({
  name: "list-dashboards",
  title: "List Dashboards",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: 64 };
    const response = await ctx.callVantageApi("/v2/dashboards", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      dashboards: response.data.dashboards,
      pagination: paginationData(response.data),
    };
  },
});
