import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific dashboard by its token. Widgets may be report-backed or free text and can include a grid layout. Each widget includes a token for get-dashboard-widget, update-dashboard-widget, and delete-dashboard-widget. The dashboard token can be used to generate a link in the Vantage Web UI: https://console.vantage.sh/go/<token>
`.trim();

const args = {
  dashboard_token: vantageToken("dashboard"),
};

export default registerTool({
  name: "get-dashboard",
  title: "Get Dashboard",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/dashboards/${pathEncode(args.dashboard_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
