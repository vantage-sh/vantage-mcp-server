import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific Report Notification by its token.

Use this tool when you already have a report notification token, such as one returned by list-report-notifications or referenced in Vantage. The response includes the notification title, Cost Report token, recipients, delivery channels, frequency, and tracked change type.

Do not use this for Cost Alerts, budget alerts, threshold alerts, or spend-limit notifications.
`.trim();

const args = {
  report_notification_token: z.string().describe("The report notification token to retrieve"),
};

export default registerTool({
  name: "get-report-notification",
  title: "Get Report Notification",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/report_notifications/${pathEncode(args.report_notification_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
