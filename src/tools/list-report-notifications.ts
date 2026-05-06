import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List the Vantage report_notifications API resource: scheduled Report Notifications for Cost Reports. Use this tool when a user asks to get, list, show, or view report notifications. Report notifications send scheduled daily, weekly, or monthly Cost Report summaries to users via email, Slack, or Microsoft Teams.
Use the page value of 1 to start.
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
