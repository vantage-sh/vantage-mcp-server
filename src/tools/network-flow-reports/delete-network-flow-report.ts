import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Network Flow Report by token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-network-flow-report",
  title: "Delete Network Flow Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    network_flow_report_token: z.string().min(1).describe("Token of the Network Flow Report to delete."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/network_flow_reports/${pathEncode(args.network_flow_report_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.network_flow_report_token };
  },
});
