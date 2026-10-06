import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Lists scheduled Dashboard emails. Use page 1 to start.

Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
  q: nonempty().optional().describe("Search Dashboard Notifications by title."),
};

export default registerTool({
  name: "list-dashboard-notifications",
  title: "List Dashboard Notifications",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/dashboard_notifications", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      dashboard_notifications: response.data.dashboard_notifications,
      pagination: paginationData(response.data),
    };
  },
});
