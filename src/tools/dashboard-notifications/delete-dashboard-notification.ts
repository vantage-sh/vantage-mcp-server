import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Dashboard Notification and stops its scheduled email. This cannot be undone. Do not use this for Report Notifications, Cost Alerts, or Budget Alerts.
`.trim();

const args = {
  dashboard_notification_token: vantageToken("dashboard_notification"),
};

export default registerTool({
  name: "delete-dashboard-notification",
  title: "Delete Dashboard Notification",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/dashboard_notifications/${pathEncode(args.dashboard_notification_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.dashboard_notification_token };
  },
});
