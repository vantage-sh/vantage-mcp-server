import z from "zod";
import paginationData from "../../utils/paginationData";
import { vantageToken } from "../../utils/zod";
import { DEFAULT_LIMIT } from "../structure/constants";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
List Budget Alerts in Vantage. Budget Alerts notify users or connected channels when one or more Budgets reach a percentage threshold during a monthly time window.
`.trim();

export default registerTool({
  name: "list-budget-alerts",
  title: "List Budget Alerts",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(DEFAULT_LIMIT)
      .describe(`Number of Budget Alerts per page, defaults to ${DEFAULT_LIMIT} and has a maximum of 1000`),
    workspace_token: vantageToken("workspace", {
      description: "When provided, return only Budget Alerts in this Workspace.",
    }).optional(),
    budget_token: vantageToken("budget", {
      description: "When provided, return only Budget Alerts monitoring this Budget.",
    }).optional(),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/budget_alerts", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return {
      budget_alerts: response.data.budget_alerts,
      pagination: paginationData(response.data),
    };
  },
});
