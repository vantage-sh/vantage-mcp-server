import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific Cost Alert by its token.

Use this tool when you already have a cost alert token, such as one returned by list-cost-alerts or referenced in Vantage. Cost Alerts are threshold-based spending alerts for Cost Reports.

Do not use this for Report Notifications, scheduled report summaries, or recurring Cost Report delivery.
`.trim();

const args = {
  cost_alert_token: z.string().min(1).describe("The cost alert token to retrieve"),
};

export default registerTool({
  name: "get-cost-alert",
  title: "Get Cost Alert",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/cost_alerts/${pathEncode(args.cost_alert_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
