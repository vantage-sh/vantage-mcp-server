import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Gets a specific resource report by its token. The token of a report can be used to generate a link to the resource report in the Vantage Web UI: https://console.vantage.sh/go/<token>
`.trim();

const args = {
  resource_report_token: z.string().describe("The resource report token to retrieve"),
};

export default registerTool({
  name: "get-resource-report",
  title: "Get Resource Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/resource_reports/${pathEncode(args.resource_report_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
