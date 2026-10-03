import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Dashboard by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-dashboard",
  title: "Delete Dashboard",
  description,
  outputSchema: {
    token: z.string().describe("The token of the deleted Dashboard."),
  },
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    dashboard_token: vantageToken("dashboard"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/dashboards/${pathEncode(args.dashboard_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.dashboard_token };
  },
});
