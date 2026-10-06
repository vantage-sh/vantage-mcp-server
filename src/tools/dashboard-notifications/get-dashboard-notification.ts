import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Returns one Dashboard Notification. Tokens come from list-dashboard-notifications. Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
`.trim();

const args = {
  dashboard_notification_token: vantageToken("dashboard_notification"),
};

export default registerTool({
  name: "get-dashboard-notification",
  title: "Get Dashboard Notification",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/dashboard_notifications/${pathEncode(args.dashboard_notification_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
