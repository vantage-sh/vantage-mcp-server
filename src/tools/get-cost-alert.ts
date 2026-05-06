import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Gets a specific Vantage Cost Alert by its cost alert token. Use this tool when a user asks to get, show, or retrieve one threshold-based spending alert.
`.trim();

const args = {
  cost_alert_token: z.string().describe("The cost alert token to retrieve"),
};

export default registerTool({
  name: "get-cost-alert",
  title: "Get Cost Alert",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: true,
  },
  args,
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/cost_alerts/${pathEncode(args.cost_alert_token)}`, {}, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
