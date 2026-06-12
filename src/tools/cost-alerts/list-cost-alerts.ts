import z from "zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import paginationData from "../utils/paginationData";

const description = `
List Cost Alerts available in the Vantage account. Cost Alerts are threshold-based spending alerts for Cost Reports.

Use this tool when a user asks to list, show, view, or find cost alerts, spending alerts, budget alerts, threshold alerts, or spend-limit notifications. Use the page value of 1 to start.

Do not use this for Report Notifications, scheduled report summaries, or recurring Cost Report delivery.
`.trim();

const args = {
  page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
};

export default registerTool({
  name: "list-cost-alerts",
  title: "List Cost Alerts",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const requestParams = { ...args, limit: DEFAULT_LIMIT };
    const response = await ctx.callVantageApi("/v2/cost_alerts", requestParams, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      cost_alerts: response.data.cost_alerts,
      pagination: paginationData(response.data),
    };
  },
});
