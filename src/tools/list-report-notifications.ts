import z from "zod";
import paginationData from "../utils/paginationData";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
List Report Notifications available in the Vantage account. Report Notifications are scheduled deliveries of Cost Report summaries to users, Slack channels, or Microsoft Teams channels.

Use this tool when a user asks to list, show, view, or find scheduled report notifications or recurring Cost Report summaries. Use the page value of 1 to start.

Do not use this for Cost Alerts, budget alerts, threshold alerts, or spend-limit notifications. Cost Alerts are threshold-based spending alerts; Report Notifications are scheduled report deliveries.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
  name: "list-report-notifications",
  title: "List Report Notifications",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/report_notifications", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      report_notifications: response.data.report_notifications,
      pagination: paginationData(response.data),
    };
  },
});
