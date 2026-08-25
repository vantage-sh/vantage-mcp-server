import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
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
    cost_alert_token: vantageToken("cost_alert"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/cost_alerts/${pathEncode(args.cost_alert_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.cost_alert_token };
  },
});
