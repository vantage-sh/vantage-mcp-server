import type { CreateDashboardRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  dateBinSchema,
  dateIntervalSchema,
  endDateSchema,
  startDateSchema,
  validateDashboardWidgets,
  widgetSchema,
} from "./schemas";

const description = `
Creates a Dashboard. Each widget shows a report, a saved view, or free text. The returned token links to the dashboard: https://console.vantage.sh/go/<token>
`.trim();

export default registerTool({
  name: "create-dashboard",
  title: "Create Dashboard",
  description,
  args: {
    title: z.string().min(1).describe("The title of the dashboard"),
    workspace_token: vantageToken("workspace"),
    widgets: z.array(widgetSchema).describe("Widgets to add. Omit for an empty Dashboard.").optional(),
    saved_filter_tokens: z
      .array(vantageToken("saved_filter"))
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
    validateDashboardWidgets(args.widgets);
    // Free-text widgets send settings.grid without display_type. The generated client still requires display_type.
    const response = await ctx.callVantageApi("/v2/dashboards", args as CreateDashboardRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
