import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a saved Network Flow Report by token. Open in the console at https://console.vantage.sh/go/<token>.
`.trim();

export default registerTool({
  name: "get-network-flow-report",
  title: "Get Network Flow Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args: {
    network_flow_report_token: vantageToken("network_flow_report"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/network_flow_reports/${pathEncode(args.network_flow_report_token)}`,
      {},
      "GET"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
