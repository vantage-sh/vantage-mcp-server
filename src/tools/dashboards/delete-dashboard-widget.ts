import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes one Dashboard Widget. The Dashboard remains. This cannot be undone. To delete the whole Dashboard, use delete-dashboard.
`.trim();

export default registerTool({
  name: "delete-dashboard-widget",
  title: "Delete Dashboard Widget",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    widget_token: vantageToken("dashboard_widget"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/widgets/${pathEncode(args.widget_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.widget_token };
  },
});
