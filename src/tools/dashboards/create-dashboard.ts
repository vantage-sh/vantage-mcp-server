import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { dateBinSchema, dateIntervalSchema, endDateSchema, startDateSchema, widgetSchema } from "./schemas";

const description = `
Create a new Dashboard in Vantage.

Dashboards are collections of widgets that visualize cost data. You can optionally attach widgets (by
their widgetable_token) and saved filters, and you can control the time range using either:
- date_interval (recommended), or
- start_date + end_date (custom range)

Note: start_date/end_date are incompatible with date_interval.

The list of supported widgets is:
- cost reports
- usage reports
- resource reports
- kubernetes efficiency reports
- financial commitment reports
- recommendation saved views

The token returned in the response can be used to link to the Dashboard in the Vantage Web UI:
https://console.vantage.sh/go/<token>
`.trim();

export default registerTool({
  name: "create-dashboard",
  title: "Create Dashboard",
  description,
  args: {
    title: z.string().min(1).describe("The title of the dashboard"),
    workspace_token: z.string().min(1).describe("The token of the Workspace to add the Dashboard to."),
    widgets: z.array(widgetSchema).describe("The widgets to add to the dashboard").optional(),
    saved_filter_tokens: z
      .array(z.string())
      .describe("The tokens of the Saved Filters used in the Dashboard")
      .optional(),
    date_bin: dateBinSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: dateIntervalSchema,
  },
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/dashboards", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
