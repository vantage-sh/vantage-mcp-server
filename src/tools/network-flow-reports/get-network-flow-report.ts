import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a saved Network Flow Report by token, including its traffic direction, weighting metric, groupings, filter, and date range. The token can also be opened at https://console.vantage.sh/go/<token>.
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
    network_flow_report_token: z.string().min(1).describe("Token of the Network Flow Report to retrieve."),
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
