import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Returns one Dashboard Widget by its token. Widget tokens come from get-dashboard.
`.trim();

export default registerTool({
  name: "get-dashboard-widget",
  title: "Get Dashboard Widget",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    widget_token: vantageToken("dashboard_widget"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/widgets/${pathEncode(args.widget_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
