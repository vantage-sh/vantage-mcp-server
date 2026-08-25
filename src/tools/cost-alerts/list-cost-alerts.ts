import z from "zod";
import paginationData from "../../utils/paginationData";
import { nonempty, vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List Cost Alerts available in the Vantage account. Cost Alerts are threshold-based spending alerts for Cost Reports.

Use this tool when a user asks to list, show, view, or find cost alerts, spending alerts, budget alerts, threshold alerts, or spend-limit notifications.

Do not use this for Report Notifications, scheduled report summaries, or recurring Cost Report delivery.
`.trim();

const args = {
  page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .default(DEFAULT_LIMIT)
    .describe(`Number of Cost Alerts per page, defaults to ${DEFAULT_LIMIT} and has a maximum of 5000`),
  q: nonempty().optional().describe("Search cost alerts by title"),
  workspace_token: vantageToken("workspace", {
    description: "When provided, return only Cost Alerts in this Workspace.",
  }).optional(),
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
    const response = await ctx.callVantageApi("/v2/cost_alerts", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      cost_alerts: response.data.cost_alerts,
      pagination: paginationData(response.data),
    };
  },
});
