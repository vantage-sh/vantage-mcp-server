import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { endDateSchema, startDateSchema, updateDateBinSchema, updateDateIntervalSchema, widgetSchema } from "./schemas";

const description = `
Updates an existing Dashboard. You can update the title, widgets, saved filters, and date range settings.
`.trim();

export default registerTool({
  name: "update-dashboard",
  title: "Update Dashboard",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    dashboard_token: z.string().describe("The token of the Dashboard to update."),
    title: z.string().min(1).optional().describe("The updated title of the dashboard."),
    widgets: z.array(widgetSchema).describe("The updated widgets for the dashboard.").optional(),
    saved_filter_tokens: z
      .array(z.string())
      .describe("The updated tokens of the Saved Filters used in the Dashboard.")
      .optional(),
    date_bin: updateDateBinSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: updateDateIntervalSchema,
  },
  async execute(args, ctx) {
    const { dashboard_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/dashboards/${pathEncode(dashboard_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
