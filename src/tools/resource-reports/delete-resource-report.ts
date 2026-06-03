import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a resource report by its token. This action is irreversible.
`.trim();

const args = {
  resource_report_token: z.string().describe("Token of the resource report to delete"),
};

export default registerTool({
  name: "delete-resource-report",
  title: "Delete Resource Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/resource_reports/${pathEncode(args.resource_report_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.resource_report_token };
  },
});
