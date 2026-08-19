import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Get a specific Budget Alert by token. Budget Alerts monitor Budget objects.
`.trim();

export default registerTool({
  name: "get-budget-alert",
  title: "Get Budget Alert",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    budget_alert_token: vantageToken("budget_alert"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/budget_alerts/${pathEncode(args.budget_alert_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
