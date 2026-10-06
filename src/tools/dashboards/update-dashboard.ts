import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  endDateSchema,
  startDateSchema,
  updateDateBinSchema,
  updateDateIntervalSchema,
  validateDashboardWidgets,
  widgetSchema,
} from "./schemas";

const description = `
Updates a Dashboard. Sending widgets replaces the entire widget list. Use update-dashboard-widget to change one report-backed widget's linked resource, title, or display settings, and delete-dashboard-widget to remove one widget. Change grid position or free-text content only by sending the full widget list here.
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
    dashboard_token: vantageToken("dashboard"),
    title: z.string().min(1).optional().describe("The updated title of the dashboard."),
    widgets: z
      .array(widgetSchema)
      .describe(
        "Full replacement widget list. Omit to keep the current widgets. Include every widget to keep. An empty array removes all widgets."
      )
      .optional(),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
      .describe("The updated tokens of the Saved Filters used in the Dashboard.")
      .optional(),
    date_bin: updateDateBinSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    date_interval: updateDateIntervalSchema,
    workspace_token: vantageToken("workspace", {
      description: "Required when updating widgets if the API token belongs to multiple Workspaces.",
    }).optional(),
  },
  async execute(args, ctx) {
    validateDashboardWidgets(args.widgets);
    const { dashboard_token, ...body } = args;
    const response = await ctx.callVantageApi(`/v2/dashboards/${pathEncode(dashboard_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
