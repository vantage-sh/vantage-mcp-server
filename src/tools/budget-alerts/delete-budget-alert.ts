import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete a Budget Alert by token. This permanently removes the alert without deleting its monitored Budgets.
`.trim();

export default registerTool({
  name: "delete-budget-alert",
  title: "Delete Budget Alert",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    budget_alert_token: vantageToken("budget_alert"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/budget_alerts/${pathEncode(args.budget_alert_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.budget_alert_token };
  },
});
