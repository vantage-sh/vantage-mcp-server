import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Deletes a Vantage report_notifications API resource by its report notification token. Use this tool when a user asks to delete or remove a report notification. This action is irreversible and stops the scheduled report summary.
`.trim();

const args = {
  report_notification_token: z.string().describe("Token of the report notification to delete"),
};

export default registerTool({
  name: "delete-report-notification",
  title: "Delete Report Notification",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/report_notifications/${pathEncode(args.report_notification_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.report_notification_token };
  },
});
