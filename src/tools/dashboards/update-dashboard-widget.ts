import { pathEncode, type UpdateDashboardWidgetRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { widgetSettingsUpdateSchema } from "./schemas";

const description = `
Updates one Dashboard Widget's resource, title, or display settings. Omitted fields stay unchanged. To replace the whole widget list, including grid layout or free text content, use update-dashboard.
`.trim();

const mutableFields = ["widgetable_token", "title", "settings"] as const;

export default registerTool({
  name: "update-dashboard-widget",
  title: "Update Dashboard Widget",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    widget_token: vantageToken("dashboard_widget"),
    widgetable_token: z.string().optional().describe("The token of the Resource represented by the Widget."),
    title: z.string().optional().describe("The title of the Widget."),
    settings: widgetSettingsUpdateSchema.optional().describe("Display settings for the Widget."),
  },
  async execute(args, ctx) {
    if (!mutableFields.some((field) => args[field] !== undefined)) {
      throw new MCPUserError({
        errors: [{ message: "At least one Dashboard Widget field must be provided." }],
      });
    }

    const { widget_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/widgets/${pathEncode(widget_token)}`,
      body as UpdateDashboardWidgetRequest,
      "PATCH"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
