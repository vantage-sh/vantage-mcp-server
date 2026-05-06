import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific Vantage report_notifications API resource by its report notification token. Use this tool when a user asks to get, show, or retrieve one report notification. Report notifications send scheduled Cost Report summaries to users via email, Slack, or Microsoft Teams.
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
