import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import { dateIntervalOptions } from "./utils/dateIntervalOptions";
import dateValidator from "./utils/dateValidator";

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

const widgetSchema = z.object({
  widgetable_token: z.string().describe("The token of the represented Resource."),
  title: z.string().describe("The title of the Widget (defaults to the title of the Resource).").optional(),
  settings: z
    .object({
      display_type: z.enum(["table", "chart"]).describe("The display type of the Widget."),
    })
    .optional(),
});

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
    date_bin: z
      .enum(["day", "week", "month"])
      .optional()
      .describe("Date binning for returned costs, allowed values: day, week, month"),
    start_date: dateValidator(
      "The start date of the dashboard. ISO 8601 Formatted. Incompatible with 'date_interval' parameter."
    ).optional(),
    end_date: dateValidator(
      "The end date of the dashboard. ISO 8601 Formatted. Incompatible with 'date_interval' parameter, required with 'start_date'."
    ).optional(),
    date_interval: z
      .enum(dateIntervalOptions)
      .optional()
      .describe("The date interval of the dashboard. Incompatible with 'start_date' and 'end_date' parameters."),
  },
  annotations: {
    destructive: true,
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
