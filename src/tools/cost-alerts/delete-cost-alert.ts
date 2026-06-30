import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Cost Alert by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-cost-alert",
  title: "Delete Cost Alert",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    cost_alert_token: z.string().min(1).describe("The token of the Cost Alert to delete."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/cost_alerts/${pathEncode(args.cost_alert_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.cost_alert_token };
  },
});
